const { readFile } = require("fs");
const importLazy = require("import-lazy")(require);
const network = importLazy("balanceofsatoshis/network");
const swaps = importLazy("balanceofsatoshis/swaps");
const lnd = importLazy("balanceofsatoshis/lnd");
const asyncAuto = require("async/auto");
const asyncEach = require("async/each");
const { returnResult } = require("asyncjs-util");
const sortingStrategies = require("./sorting_strategies");

module.exports = (args, cbk) => {
  return asyncAuto(
    {
      lnd: [
        (cbk) => {
          return lnd.authenticatedLnd(
            {
              logger: args.logger,
              node: args.node,
            },
            (err, res) => {
              cbk(null, { lnd: res.lnd });
            }
          );
        },
      ],

      sortStrategyFn: [
        (cbk) => {
          if (sortingStrategies[args.sort_strategy] !== undefined) {
            cbk(null, sortingStrategies[args.sort_strategy]);
          } else {
            throw new Error(
              "sorting strategy `" +
                args.sort_strategy +
                "` is not implemented."
            );
          }
        },
      ],

      peers: [
        "lnd",
        ({ lnd }, cbk) => {
          return network.getPeers(
            {
              is_active: true,
              is_table: false,
              is_public: args.is_public,
              is_private: args.is_private,
              lnd: lnd.lnd,
              omit: [],
              fs: { getFile: readFile },
            },
            (err, res) => {
              cbk(null, { peers: res.peers });
            }
          );
        },
      ],

      candidates: [
        "peers",
        ({ peers }, cbk) => {
          const peers_to_consider = peers.peers
            .map((peer) => {
              const inboundLiquidity = peer.inbound_liquidity ?? 0;
              const outboundLiquidity = peer.outbound_liquidity ?? 0;
              const totalLiquidity = inboundLiquidity + outboundLiquidity;

              return {
                alias: peer.alias,
                public_key: peer.public_key,
                outbound_liquidity: outboundLiquidity,
                inbound_liquidity: inboundLiquidity,
                total_liquidity: totalLiquidity,
                perc_inbound: inboundLiquidity / totalLiquidity,
                perc_outbound: outboundLiquidity / totalLiquidity,
              };
            })
            .filter(
              (peer) =>
                peer.perc_inbound < args.triggerPercentageInbound ||
                peer.perc_outbound < args.triggerPercentageOutbound
            );

          return cbk(null, peers_to_consider);
        },
      ],

      jobs: [
        "candidates",
        "sortStrategyFn",
        ({ candidates, sortStrategyFn }, cbk) => {
          const channels = candidates
            .map((channel) => {
              const target_liquidity = Math.round(channel.total_liquidity / 2);
              const send_to_outbound =
                channel.perc_outbound > channel.perc_inbound
                  ? channel.outbound_liquidity - target_liquidity
                  : 0;
              const send_to_inbound =
                channel.perc_inbound > channel.perc_outbound
                  ? channel.inbound_liquidity - target_liquidity
                  : 0;

              return {
                ...channel,
                target_liquidity,
                send_to_outbound,
                send_to_inbound,
              };
            })
            .reduce(
              (pc, channel) => {
                channel.perc_outbound > channel.perc_inbound
                  ? pc.outbound.push(channel)
                  : pc.inbound.push(channel);

                return pc;
              },
              {
                outbound: [],
                inbound: [],
              }
            );

          if (channels.outbound.length === 0 || channels.inbound.length === 0) {
            args.logger.info("no channels available to balance out");
            return cbk(null, []);
          }

          // sort the channels with the chosen strategy
          sortStrategyFn(channels);

          // just a very mvp strategy here, assign 0 to 0, 1 to 1, etc, uneven inbound channels are left out for now
          let jobs = [];
          for (let x = 0; x < channels.outbound.length; x++) {
            if (
              channels.outbound[x] === undefined ||
              channels.inbound[x] === undefined
            ) {
              continue;
            }

            jobs.push({
              outbound: channels.outbound[x],
              inbound: channels.inbound[x],
            });
          }

          return cbk(null, jobs);
        },
      ],

      rebalance: [
        "jobs",
        ({ jobs, lnd }, cbk) => {
          asyncEach(
            jobs,
            function (job, callback) {
              swaps.rebalance(
                {
                  logger: args.logger,
                  avoid: args.avoid,
                  fs: { getFile: readFile },
                  in_through: job.inbound.public_key,
                  lnd: lnd.lnd,
                  max_fee: args.max_fee,
                  max_fee_rate: args.max_fee_rate,
                  node: args.node || undefined,
                  out_inbound: "CAPACITY/2",
                  out_channels: [],
                  out_through: job.outbound.public_key,
                  timeout_minutes: args.minutes,
                },
                (err, res) => {
                  if (!!err) {
                    args.logger.error({ err });
                  } else {
                    args.logger.info({ res });
                  }

                  callback();
                }
              );
            },
            function (err, result) {
              cbk(null, result);
            }
          );
        },
      ],
    },
    returnResult({ of: "rebalance" }, cbk)
  );
};
