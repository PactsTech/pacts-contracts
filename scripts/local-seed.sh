#!/bin/bash

geth="docker compose exec geth geth attach --exec \"eth.sendTransaction({ from: '0x123463a4b065722e99115d6c222f267d9cabb524', to: '0xcc337470cc94d79fd59c823c457b3fa0d9390b70', value: '32000000000000000000', gasPrice: '1000000007', gas: '100098' }, (err, resp) => { if (err) { console.error(err); } else { console.log(resp); } })\" /execution/geth.ipc"
eval "$geth"