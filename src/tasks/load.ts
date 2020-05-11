import { IpcMainEvent, dialog, ipcMain } from 'electron';

type FileHandle = any

export default async function taskLoad(event: IpcMainEvent, arg: any) {
  const { filename } = arg;
  const bytesOffsetToFirstValue = arg.offset;

  function littleEndian(string: string) { return (string.match(/.{2}/g) || ['']).reverse().join(''); }
  function toInt(buffer: Buffer, parseFunction: (string: string) => string) { return parseInt(parseFunction(buffer.toString('hex')), 16); }

  async function get(file: FileHandle, length: number, offset: number) {
    const buffer = Buffer.alloc(length);
    await file.read(buffer, 0, length, offset);
    return {
      next: offset + length,
      buffer,
    };
  }

  async function wordPairReader(file: FileHandle, fileOffset: number) {
    const result = {
      next: 0,
      key: '',
      word: '',
      encoding: '',
      position: {
        from: fileOffset,
        to: 0, // exclusive
      },
      size: {
        key: 0,
        word: 0,
        tail: 0,
        total: 0,
      },
    };

    let output;
    output = await get(file, 4, fileOffset); // key length
    result.size.key = toInt(output.buffer, littleEndian);
    output = await get(file, toInt(output.buffer, littleEndian), output.next); // key value
    result.key = output.buffer.toString('hex');

    output = await get(file, 4, output.next); // word length raw
    let wordLength = toInt(output.buffer, littleEndian); // assume ascii
    result.encoding = 'ascii';
    if (toInt(output.buffer, littleEndian) > 2147483647) {
      // as unicode
      wordLength = (0xFFFFFFFF - toInt(output.buffer, littleEndian)) * 2; // * 2 as unicode
      result.encoding = 'unicode';
    }
    result.size.word = wordLength;
    output = await get(file, wordLength, output.next);
    result.word = output.buffer.toString('hex');

    let tailCheck = 0;
    let nextFromtTail = 0;
    while (tailCheck === 0) {
      output = await get(file, 1, output.next);
      tailCheck = toInt(output.buffer, littleEndian);
      nextFromtTail = output.next;
      result.size.tail += 1;
    }
    result.size.tail -= 1; // while loop finished with additional one byte
    result.next = nextFromtTail - 1; // while loop finished with additional one byte
    result.size.total = 4 + result.size.key + 4 + result.size.word + result.size.tail;

    result.position.to = output.next;

    return result;
  }

  const fs = require('fs').promises;
  const file = await fs.open(`${filename}`);

  const stat = await file.stat();
  const { size } = stat;

  const header = await get(file, bytesOffsetToFirstValue, 0);

  let footer = {} as { next: number; buffer: Buffer };
  const wordPairs = [];
  let next = bytesOffsetToFirstValue;
  try {
    while (next < size) {
      const res = await wordPairReader(file, next);
      next = res.next;
      wordPairs.push(res);
    }
  } catch (e) {
    console.log('File read should successfully finished.');
  } finally {
    footer = await get(file, size - next, next);
  }

  const convert = (from: string, to: string) => (str: string) => Buffer.from(str, from).toString(to);
  const toAscii = convert('hex', 'ascii');
  const toUnicode = convert('hex', 'utf16le');
  wordPairs.map((pair) => {
    type NewPair = typeof pair & { keyText?: string; wordText?: string };
    const newObj: NewPair = pair;
    newObj.keyText = toAscii(pair.key);
    if (pair.encoding === 'ascii') newObj.wordText = toAscii(pair.word);
    else newObj.wordText = toUnicode(pair.word);
    return newObj;
  });

  const output = {
    header: header.buffer.toString('hex'),
    footer: footer.buffer.toString('hex'),
    originalSize: size,
    wordPairs,
  };

  let checkWordPairsSize = 0;
  wordPairs.forEach((elm) => {
    checkWordPairsSize += (elm.key.length / 2) + (elm.word.length / 2) + 4 + 4 + (elm.size.tail);
  });
  const crossCheckSize = (output.header.length / 2) + (output.footer.length / 2) + checkWordPairsSize;

  console.log('Output size validation:', (crossCheckSize === output.originalSize) ? 'passed' : 'failed');

  // await fs.writeFile(`${filename}.parsed.json`, JSON.stringify(output, null, 2));

  event.reply('load-reply', JSON.stringify(output));
}
