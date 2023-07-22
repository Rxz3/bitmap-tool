import axios from 'axios'

export async function getBlockHeight(): Promise<number> {
  const { data } = await axios.get(
    'https://mempool.space/api/blocks/tip/height'
  )
  return data
}

export async function getAdjustedVsize(txid: string) {
  const res = await axios.get(`https://mempool.space/api/v1/cpfp/${txid}`)
  return res.data.adjustedVsize
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

export async function getTranscationHex(inscriptionId: string) {
  const { data } = await axios.get(
    `https://ordinals.com/inscription/${inscriptionId}`
  )
  const dom = new DOMParser().parseFromString(data, 'text/html')
  return dom.querySelectorAll('dd')[11].textContent
}
