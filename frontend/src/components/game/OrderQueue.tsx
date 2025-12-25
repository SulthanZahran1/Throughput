import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { hasOrderRadar } from '../../engine/upgrades';
import { URGENT_ORDER_THRESHOLD, PRODUCT_DEFINITIONS } from '../../constants/config';
import * as Icons from 'lucide-react';

export const OrderQueue: React.FC = () => {
    const orders = useGameStore(state => state.orders);
    const items = useGameStore(state => state.items);
    const failedOrders = useGameStore(state => state.failedOrders);
    const upgrades = useGameStore(state => state.upgrades);

    const radarActive = hasOrderRadar(upgrades);

    return (
        <div className="flex flex-col gap-1.5 sm:gap-2 w-full lg:w-72 max-w-sm p-3 sm:p-4 bg-gray-900 rounded-lg border border-gray-800 max-h-64 sm:max-h-80 lg:max-h-none overflow-y-auto shadow-2xl">
            <h2 className="text-sm sm:text-lg font-bold text-gray-100">Orders</h2>
            <div className="text-xs sm:text-sm text-red-400 mb-1 sm:mb-2">Failed: {failedOrders} / 5</div>

            <div className="flex flex-col gap-1 sm:gap-2">
                <AnimatePresence>
                    {orders.map(order => {
                        const isUrgent = radarActive && order.timeLeft < URGENT_ORDER_THRESHOLD;
                        const product = PRODUCT_DEFINITIONS[order.type];
                        const Icon = (Icons as any)[product.icon] || Icons.Package;

                        // Fragile check: Blue item on ground
                        const isFragileOnGround = order.type === 'blue' && items.some(i => i.id === order.itemId);

                        return (
                            <motion.div
                                key={order.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={isUrgent ? {
                                    opacity: 1,
                                    x: 0,
                                    scale: [1, 1.02, 1],
                                    rotate: [0, -1, 1, -1, 0]
                                } : {
                                    opacity: 1,
                                    x: 0
                                }}
                                transition={isUrgent ? {
                                    scale: { duration: 0.4, repeat: Infinity },
                                    rotate: { duration: 0.2, repeat: Infinity }
                                } : {}}
                                exit={{ opacity: 0, x: 20 }}
                                className={`flex flex-col p-1.5 sm:p-2 bg-gray-800 rounded border transition-all ${isUrgent
                                    ? 'border-red-500 shadow-lg shadow-red-500/30'
                                    : 'border-gray-700'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                        <div className={`w-6 h-6 rounded flex items-center justify-center bg-gradient-to-br ${product.gradient}`}>
                                            <Icon size={14} color="white" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-100 text-xs sm:text-sm leading-none">{product.name}</span>
                                            <span className="text-[10px] text-gray-400 uppercase tracking-wider">{product.trait}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        {isUrgent && <span className="text-red-400 text-[10px] sm:text-xs">⚠️</span>}
                                        {isFragileOnGround && <Icons.GlassWater size={12} className="text-blue-400 animate-bounce" />}
                                    </div>
                                </div>

                                <div className="w-full h-1.5 sm:h-2 bg-gray-700 rounded-full overflow-hidden">
                                    <motion.div
                                        className={`h-full ${isUrgent ? 'bg-red-500' : 'bg-yellow-500'}`}
                                        initial={{ width: '100%' }}
                                        animate={{ width: `${(order.timeLeft / order.totalTime) * 100}%` }}
                                        transition={{ duration: 0.1, ease: "linear" }}
                                    />
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {orders.length === 0 && (
                    <div className="text-gray-500 text-xs sm:text-sm italic">No active orders</div>
                )}
            </div>
        </div>
    );
};
