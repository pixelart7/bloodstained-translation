import { promises as fs } from 'fs';
import { IpcMainEvent, dialog } from 'electron';

export async function pickFile(event: IpcMainEvent, arg: any) {
  const res = await dialog.showOpenDialog({ properties: ['openFile'] });
  if (!res || res.canceled) return;
  const filePath = (res as any).filePaths[0];

  event.reply('pick-reply', filePath);
}

export async function pickSaveFile(event: IpcMainEvent, arg: any) {
  const res = await dialog.showSaveDialog({
    defaultPath: 'translation.json'
  });
  if (!res || res.canceled) return;
  const filePath = (res as any).filePath;
  console.log(filePath);
  event.reply('pick-save-file-reply', filePath);
}

export async function saveJson(event: IpcMainEvent, arg: any) {
  console.log(arg.file);
  console.log(arg.filepath);
  await fs.writeFile(arg.filepath, JSON.stringify(arg.file, null, 2));
  event.reply('save-json-reply');
}
