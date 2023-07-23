import axios from 'axios'
import { sleep } from '../utils'

export async function getBlockHeight(): Promise<number> {
  const { data } = await axios.get(
    'https://mempool.space/api/blocks/tip/height'
  )
  return data
}

export async function getBlockHash(blockHeight: number) {
  const { data } = await axios.get(
    `https://mempool.space/api/block-height/${blockHeight}`
  )
  return data
}

export async function getBlocInfo(blockHash: string) {
  const { data } = await axios.get(
    `https://mempool.space/api/v1/block/${blockHash}`
  )
  return data
}

export async function getEffectiveFeePerVsize(txid: string) {
  const res = await axios.get(`https://mempool.space/api/v1/cpfp/${txid}`)
  let { effectiveFeePerVsize } = res.data
  while (!effectiveFeePerVsize) {
    await sleep(1000)
    const res = await axios.get(`https://mempool.space/api/v1/cpfp/${txid}`)
    effectiveFeePerVsize = res.data.effectiveFeePerVsize
  }
  return effectiveFeePerVsize
}

export async function getTranscationInfo(txid: string) {
  const res = await axios.get(`https://mempool.space/api/tx/${txid}`)
  return res.data
}

export async function searchBRCText(text: string) {
  const res = await axios.get(
    '/.netlify/functions/unisat/api/query/inscriptions/category/text/search/v2',
    {
      params: {
        name: text,
        limit: 32,
        start: 0,
      },
    }
  )
  return res.data.data
}

export async function getTranscationId(inscriptionId: string) {
  const { data } = await axios.get(
    `https://ordinals.com/inscription/${inscriptionId}`
  )
  const dom = new DOMParser().parseFromString(data, 'text/html')
  return dom.querySelectorAll('dd')[11].textContent
}
