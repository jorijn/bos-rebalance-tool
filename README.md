# BOS Rebalance Tool

Uses BOS (https://github.com/alexbosworth/balanceofsatoshis).

This tool will gather all lopsided channels, match them to each other by size and start parallel balancing jobs using BOS.

It's meant to run in a periodic cronjob.

## Install
```shell
$ git clone git@github.com:Jorijn/bos-rebalance-tool.git
$ cd bos-rebalance-tool
$ npm ci --production
```

## How to run
```
❯ ./bos-rt.js rebalance --help

   bos-rt.js 0.0.1 - Tool for opinionated rebalancing using Balance of Satoshis

   USAGE

     bos-rt.js rebalance

   OPTIONS

     --node <node_name>                                     Get details from named node                                                                  optional
     --trigger-percentage-in <trigger_percentage_in>        Use specific percentage for triggering consideration of channel, default: 10 (inbound)       optional
     --trigger-percentage-out <trigger_percentage_out>      Use specific percentage for triggering consideration of channel, default: 10 (outbound)      optional
     --avoid <pubkey>                                       Avoid forwarding through node                                                                optional
     --max-fee <max_fee>                                    Maximum fee to pay                                                                           optional
     --max-fee-rate <max_fee_rate>                          Max fee rate to pay                                                                          optional
     --minutes <minutes>                                    Time-out route search after N minutes                                                        optional
     --no-color                                             Mute all colors                                                                              optional      default: false
     --private                                              Only private channels                                                                        optional      default: false
     --public                                               Only peers with public channels                                                              optional      default: false

   GLOBAL OPTIONS

     -h, --help         Display help
     -V, --version      Display version
     --no-color         Disable colors
     --quiet            Quiet mode - only displays warn and error messages
     -v, --verbose      Verbose mode - will also output debug messages
```

## Example

```shell
$ /path/to/bos-rt.js rebalance --trigger-percentage-in 10 --trigger-percentage-out 10 --minutes 30 --public
```
