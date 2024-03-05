import { Options } from "@layerzerolabs/lz-v2-utilities";

export const getOptions = async () => {
  const executorGas = 2000000; // Gas limit for the executor
  const executorValue = 0; // msg.value for the lzReceive() function on destination in wei
  const _options = Options.newOptions().addExecutorLzReceiveOption(
    executorGas,
    executorValue
  );
  const formatedOptions = _options.toHex();
  return formatedOptions;
};
