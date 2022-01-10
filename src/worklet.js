class MyAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
  }

  process(inputList, outputList, parameters) {
    /* using the inputs (or not, as needed), write the output
       into each of the outputs */
    console.log(this);
    console.log(this);
    return true;
  }
};

registerProcessor("get-track-data", MyAudioProcessor);