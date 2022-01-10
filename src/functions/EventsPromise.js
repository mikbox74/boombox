/**
 * 
 * @param {*} target An element emits events
 * @param {*} func Code to execute after adding listeners
 * @param {*} events 1-2 pairs `event name: event listener` (second to reject)
 * @returns Promise
 */
export default function (target, func, events) {
  let eventNames = Object.keys(events);
  let eventHandlers = Object.values(events);
  return new Promise((resolve, reject) => {
    let rejectFunc;
    const resolveFunc = (e) => {
      if (eventNames[1]) {
        target.removeEventListener(eventNames[1], rejectFunc);
      }
      resolve(eventHandlers[0](e));
    };
    target.addEventListener(eventNames[0], resolveFunc, {once: true});

    if (eventNames[1]) {
      rejectFunc = (e) => {
        target.removeEventListener(eventNames[0], resolveFunc);
        reject(eventHandlers[1](e));
      };
      target.addEventListener(eventNames[1], rejectFunc, {once: true});
    }

    func();
  });
};