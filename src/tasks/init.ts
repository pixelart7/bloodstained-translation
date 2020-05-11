import { IpcMainEvent } from 'electron';

export default function init(event: IpcMainEvent, arg: any) {
  console.log('init received');
  console.log(event);
  console.log(arg);
}
