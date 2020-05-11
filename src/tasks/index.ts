import { IpcMainEvent, dialog } from 'electron';

export async function pickFile(event: IpcMainEvent, arg: any) {
  const res = await dialog.showOpenDialog({ properties: ['openFile'] });
  if (!res || res.canceled) return;
  const filePath = (res as any).filePaths[0];

  event.reply('pick-reply', filePath);
}
