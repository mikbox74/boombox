export default function(timeInSeconds) {
  const pad = (num, size) => (num + "").padStart(size, "0");
  const hardPad = (num, size) => ('000' + num).slice(size * -1);
  const time = parseFloat(timeInSeconds).toFixed(3);
  const hours = Math.floor(time / 60 / 60);
  const minutes = Math.floor(time / 60) % 60;
  const seconds = Math.floor(time - minutes * 60);

  return (hours ? (pad(hours, 2) + ':'):'') + pad(minutes, 2) + ':' + hardPad(seconds, 2);
}