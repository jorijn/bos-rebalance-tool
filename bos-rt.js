#!/usr/bin/env node

const importLazy = require("import-lazy")(require);
const prog = importLazy("caporal");
const { version, description } = importLazy("./package");
const responses = importLazy("balanceofsatoshis/responses");
const rebalance = importLazy("./rebalance");
const { REPEATABLE, INT } = prog;
const flatten = (arr) => [].concat(...arr);

prog
  .version(version)
  .description(description)
  .command(
    "rebalance",
    "Look at which channels are lopsided and try to balance them back into 50:50"
  )
  .option("--node <node_name>", "Get details from named node")
  .option(
    "--sort-strategy <sort_strategy>",
    "Sorting strategy for matching channels (default: size, available: size, shuffle)"
  )
  .option(
    "--trigger-percentage-in <trigger_percentage_in>",
    "Use specific percentage for triggering consideration of channel, default: 10 (inbound)",
    INT
  )
  .option(
    "--trigger-percentage-out <trigger_percentage_out>",
    "Use specific percentage for triggering consideration of channel, default: 10 (outbound)",
    INT
  )
  .option("--avoid <pubkey>", "Avoid forwarding through node", REPEATABLE)
  .option("--max-fee <max_fee>", "Maximum fee to pay", INT)
  .option("--max-fee-rate <max_fee_rate>", "Max fee rate to pay", INT)
  .option("--minutes <minutes>", "Time-out route search after N minutes", INT)
  .option("--no-color", "Mute all colors")
  .option("--private", "Only private channels")
  .option("--public", "Only peers with public channels")
  .action((args, options, logger) => {
    return new Promise((resolve, reject) => {
      return rebalance.startRebalance(
        {
          is_private: !!options.private,
          is_public: !!options.public,
          node: options.node,
          triggerPercentageInbound: (options.triggerPercentageIn ?? 10) / 100,
          triggerPercentageOutbound: (options.triggerPercentageOut ?? 10) / 100,
          logger,
          avoid: flatten([options.avoid].filter((n) => !!n)),
          max_fee: options.maxFee,
          max_fee_rate: options.maxFeeRate,
          timeout_minutes: options.minutes || undefined,
          sort_strategy: options.sortStrategy || "size",
        },
        responses.returnObject({ logger, reject, resolve })
      );
    });
  });

prog.parse(process.argv);
