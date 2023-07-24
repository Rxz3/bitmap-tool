<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useWebSocket } from '../composables'
import {
  getBlocInfo,
  getBlockHash,
  getBlockHeight,
  getEffectiveFeePerVsize,
  getTranscationInfo,
  searchBRCText,
} from '../api'
import { base64ToUtf8, retry, shortenAddress } from '../utils'
import Footer from '../components/Footer.vue'
import 'dayjs/locale/zh-cn'

dayjs.locale('zh-cn')
dayjs.extend(relativeTime)

interface Data {
  name: string
  fee: number
  feeRate: string
  address: string
  timestamp: number
}

interface LiveData {
  txid: string
  name: string
  fee: number
  feeRate: string
  address: string
}

const REFRESH_INTERVAL = 10000

const blockHeight = ref(0)
const nextBlockHeight = computed(() => blockHeight.value + 1)

const currentData = ref<Data[]>([])
const nextData = ref<Data[]>([])

const currentLiveData = useLocalStorage<LiveData[]>('currentLiveData', [])
const nextLiveData = useLocalStorage<LiveData[]>('nextLiveData', [])

const blockAvgFeeRate = ref(0)
const blockTimestamp = ref(0)

const blockTime = computed(() => {
  return dayjs(blockTimestamp.value).fromNow()
})

async function getBitmapInfo(block: number) {
  const name = `${block}.bitmap`
  const { matchCount, detail } = await searchBRCText(name)

  if (matchCount === 0) return []

  return await Promise.all(
    detail.map(async (d: any) => {
      const { inscriptionId, inSatoshi, outSatoshi, address, timestamp } = d

      return {
        name,
        fee: inSatoshi - outSatoshi,
        feeRate: ((inSatoshi - outSatoshi) / 173.5).toFixed(2),
        address,
        timestamp: timestamp * 1000,
      }
    })
  )
}

async function setBlockInfo() {
  currentData.value = await getBitmapInfo(blockHeight.value)
  nextData.value = await getBitmapInfo(nextBlockHeight.value)
  const blockHash = await getBlockHash(blockHeight.value)
  const _blockInfo = await getBlocInfo(blockHash)
  blockAvgFeeRate.value = _blockInfo.extras.avgFeeRate
  blockTimestamp.value = _blockInfo.timestamp * 1000
}

function setTableRowClassName(row: any, data: any) {
  if (row.feeRate === Math.max(data.map((d: any) => d.feeRate))) {
    return 'max'
  }
  return ''
}

const currentTableRowClassName = ({ row }: any) =>
  setTableRowClassName(row, currentData.value)

const nextTableRowClassName = ({ row }: any) =>
  setTableRowClassName(row, nextData.value)

const currentLiveTableRowClassName = ({ row }: any) =>
  setTableRowClassName(row, currentLiveData.value)

const nextLiveTableRowClassName = ({ row }: any) =>
  setTableRowClassName(row, nextLiveData.value)

onMounted(async () => {
  blockHeight.value = await getBlockHeight()
  await setBlockInfo()

  setInterval(() => {
    blockTimestamp.value -= 1000
    getBlockHeight().then((height) => {
      blockHeight.value = height
    })
  }, 1000)

  setInterval(async () => {
    currentData.value = await getBitmapInfo(blockHeight.value)
    nextData.value = await getBitmapInfo(nextBlockHeight.value)
  }, REFRESH_INTERVAL)
})

const ws = useWebSocket({
  url: 'wss://wstest.ordipulse.com/ws/v1/brc20mint',
  pingMessage: JSON.stringify({ type: 'ping' }),
})

watch(ws, () => {
  ws.value!.onmessage = async (event: any) => {
    const res = event.data === 'ok' ? null : JSON.parse(event.data)
    if (res?.msg_type === 'Mempool') {
      const { ordinals, t } = res.data

      for (let i = 0; i < ordinals.length; i++) {
        const { inscription_id, inscription_data } = ordinals[i]
        const inscription = base64ToUtf8(inscription_data.body)
        if (/^\d+\.bitmap/.test(inscription)) {
          const logColor =
            inscription === `${blockHeight.value}.bitmap`
              ? '#67c23a'
              : inscription === `${nextBlockHeight.value}.bitmap`
              ? '#e6a23c'
              : '#333'
          // eslint-disable-next-line no-console
          console.log(
            `%c${inscription} https://mempool.space/tx/${inscription_id}`,
            `color: ${logColor}`
          )
        }
        if (inscription === `${nextBlockHeight.value}.bitmap`) {
          const [txInfo, effectiveFeePerVsize] = await Promise.all([
            retry(
              getTranscationInfo,
              Number.MAX_SAFE_INTEGER,
              1000
            )(inscription_id),
            getEffectiveFeePerVsize(inscription_id),
          ])

          if (!nextLiveData.value.find((d) => d.txid === inscription_id)) {
            nextLiveData.value.push({
              txid: inscription_id,
              name: inscription,
              fee: txInfo.fee,
              feeRate: effectiveFeePerVsize.toFixed(2),
              address: txInfo.vout[0].scriptpubkey_address,
            })
          }
        }
      }
    }
  }
})

watch(blockHeight, async (newVal, oldVal) => {
  if (newVal === oldVal + 1) {
    currentLiveData.value = nextLiveData.value
    nextLiveData.value = []
  }
  await setBlockInfo()
})
</script>

<template>
  <div class="flex flex-col lg:flex-row gap-8">
    <el-card class="wrapper-card flex-1">
      <div class="w-full text-center">实时面板</div>
      <el-card shadow="never">
        <template #header>
          <el-tag size="large" type="warning">{{ nextBlockHeight }}</el-tag>
        </template>
        <el-table
          :data="nextLiveData"
          :row-class-name="nextLiveTableRowClassName"
        >
          <el-table-column prop="name" label="铭文" />
          <el-table-column prop="fee" label="费用 (sats)" />
          <el-table-column prop="feeRate" label="费率 (sat/vB)" />
          <el-table-column prop="address" label="地址">
            <template #default="scope">
              <el-link
                type="primary"
                :underline="false"
                :href="`https://mempool.space/tx/${scope.row.txid}`"
                target="_blank"
                >{{ shortenAddress(scope.row.address) }}</el-link
              >
            </template>
          </el-table-column>
        </el-table>
      </el-card>
      <el-card shadow="never">
        <template #header>
          <div class="flex justify-between items-center">
            <el-tag size="large" type="success">{{ blockHeight }}</el-tag>
            <div class="flex items-center gap-4">
              <div class="text-[#67c23a]">
                ~{{ blockAvgFeeRate }}
                <span class="text-sm">sat/vB</span>
              </div>
              <div class="text-sm">
                {{ blockTime }}
              </div>
            </div>
          </div>
        </template>
        <el-table
          :data="currentLiveData"
          :row-class-name="currentLiveTableRowClassName"
        >
          <el-table-column prop="name" label="铭文" />
          <el-table-column prop="fee" label="费用 (sats)" />
          <el-table-column prop="feeRate" label="费率 (sat/vB)" />
          <el-table-column prop="address" label="地址">
            <template #default="scope">
              <el-link
                type="primary"
                :underline="false"
                :href="`https://mempool.space/tx/${scope.row.txid}`"
                target="_blank"
                >{{ shortenAddress(scope.row.address) }}</el-link
              >
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </el-card>
    <el-card class="wrapper-card flex-1">
      <div class="w-full text-center">延时面板</div>
      <el-card shadow="never">
        <template #header>
          <el-tag size="large" type="warning">{{ nextBlockHeight }}</el-tag>
        </template>
        <el-table :data="nextData" :row-class-name="nextTableRowClassName">
          <el-table-column prop="name" label="铭文" />
          <el-table-column prop="fee" label="费用 (sats)" />
          <el-table-column prop="feeRate" label="费率 (sat/vB)" />
          <el-table-column prop="address" label="地址">
            <template #default="scope">
              <el-link
                type="primary"
                :underline="false"
                :href="`https://mempool.space/address/${scope.row.address}`"
                target="_blank"
                >{{ shortenAddress(scope.row.address) }}</el-link
              >
            </template>
          </el-table-column>
          <el-table-column prop="timestamp" label="时间">
            <template #default="scope">
              {{
                scope.row.timestamp === 0
                  ? '刚刚'
                  : dayjs(scope.row.timestamp).fromNow()
              }}
            </template>
          </el-table-column>
        </el-table>
      </el-card>
      <el-card shadow="never">
        <template #header>
          <div class="flex justify-between items-center">
            <el-tag size="large" type="success">{{ blockHeight }}</el-tag>
            <div class="flex items-center gap-4">
              <div class="text-[#67c23a]">
                ~{{ blockAvgFeeRate }}
                <span class="text-sm">sat/vB</span>
              </div>
              <div class="text-sm">
                {{ blockTime }}
              </div>
            </div>
          </div>
        </template>
        <el-table
          :data="currentData"
          :row-class-name="currentTableRowClassName"
        >
          <el-table-column prop="name" label="铭文" />
          <el-table-column prop="fee" label="费用 (sats)" />
          <el-table-column prop="feeRate" label="费率 (sat/vB)" />
          <el-table-column prop="address" label="地址">
            <template #default="scope">
              <el-link
                type="primary"
                :underline="false"
                :href="`https://mempool.space/address/${scope.row.address}`"
                target="_blank"
                >{{ shortenAddress(scope.row.address) }}</el-link
              >
            </template>
          </el-table-column>
          <el-table-column prop="timestamp" label="时间">
            <template #default="scope">
              {{
                scope.row.timestamp === 0
                  ? '刚刚'
                  : dayjs(scope.row.timestamp).fromNow()
              }}
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </el-card>
  </div>
  <div class="text-center">
    <Footer />
  </div>
</template>

<style scoped>
.el-button--primary {
  background-color: var(--el-color-primary);
}

.el-button--primary.is-disabled,
.el-button--primary.is-disabled:hover {
  background-color: var(--el-color-primary-light-5);
}
.el-button--primary:hover {
  background-color: var(--el-color-primary-light-3);
}
.el-button--primary:active {
  background-color: var(--el-color-primary-dark-2);
}

.el-table :deep(.max) {
  color: var(--el-color-danger);
}

.wrapper-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
