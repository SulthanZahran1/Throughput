import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { hasOrderRadar } from '../../engine/upgrades';
import { URGENT_ORDER_THRESHOLD } from '../../constants/config';

export const OrderQueue: React.FC = () => {
    const orders = useGameStore(state => state.orders);
    const failedOrders = useGameStore(state => state.failedOrders);
    const upgrades = useGameStore(state => state.upgrades);

    const radarActive = hasOrderRadar(upgrades);

    return (
        <div className="flex flex-col gap-1 sm:gap-2 w-full md:w-64 max-w-xs p-2 sm:p-4 bg-gray-900 rounded-lg border border-gray-800 max-h-48 md:max-h-none overflow-y-auto">
            <h2 className="text-sm sm:text-lg font-bold text-gray-100">Orders</h2>
            <div className="text-xs sm:text-sm text-red-400 mb-1 sm:mb-2">Failed: {failedOrders} / 5</div>

            <div className="flex flex-col gap-1 sm:gap-2">
                <AnimatePresence>
                    {orders.map(order => {
                        const isUrgent = radarActive && order.timeLeft < URGENT_ORDER_THRESHOLD;
                        return (
                            <motion.div
                                key={order.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className={`flex items-center justify-between p-1.5 sm:p-2 bg-gray-800 rounded border transition-all ${isUrgent
                                    ? 'border-red-500 shadow-lg shadow-red-500/30 animate-pulse'
                                    : 'border-gray-700'
                                    }`}
                            >
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                    <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-sm ${order.type === 'red' ? 'bg-red-500' :
                                        order.type === 'blue' ? 'bg-blue-500' : 'bg-green-500'
                                        }`} />
                                    <span className="capitalize text-gray-300 text-xs sm:text-base">{order.type}</span>
                                    {isUrgent && <span className="text-red-400 text-[10px] sm:text-xs">⚠️</span>}
                                </div>

                                <div className="w-12 sm:w-16 h-1.5 sm:h-2 bg-gray-700 rounded-full overflow-hidden">
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
