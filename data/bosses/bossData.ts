
import { BossType, MapType } from '../../types';

export interface BossConfig {
    type: BossType;
    name: string;
    title: string;
    hpMultiplier: number; // Multiplied by level
    baseDamage: number;
    color: string;
    radius: number;
    phases: number[]; // HP percentages to trigger phase changes
    themeColor: string;
    description: string;
}

export const BOSS_DEFINITIONS: Record<BossType, BossConfig> = {
    [BossType.SHOGUN]: {
        type: BossType.SHOGUN,
        name: '腐朽将军',
        title: 'THE ROTTING SHOGUN',
        hpMultiplier: 3500,
        baseDamage: 40,
        color: '#4a0404', // Deep blood red
        radius: 60,
        phases: [0.5], // Phase 2 at 50% HP
        themeColor: '#ef4444',
        description: '被遗忘的古代武士，其剑刃依旧渴望鲜血。'
    },
    [BossType.CONSTRUCT]: {
        type: BossType.CONSTRUCT,
        name: '极寒构造体',
        title: 'GLACIAL CONSTRUCT',
        hpMultiplier: 4500,
        baseDamage: 50,
        color: '#bae6fd', // Ice blue
        radius: 70,
        phases: [0.6, 0.3], // Phases at 60% and 30%
        themeColor: '#0ea5e9',
        description: '守卫着永冻核心的史前机械。'
    },
    [BossType.NONE]: {
        type: BossType.NONE,
        name: 'Dummy',
        title: '',
        hpMultiplier: 1,
        baseDamage: 1,
        color: '#fff',
        radius: 10,
        phases: [],
        themeColor: '#fff',
        description: ''
    }
};

export const getBossForMap = (mapType: MapType): BossType => {
    switch (mapType) {
        case MapType.GRASSLAND: return BossType.SHOGUN;
        case MapType.ICE_WORLD: return BossType.CONSTRUCT;
        default: return BossType.SHOGUN;
    }
};
