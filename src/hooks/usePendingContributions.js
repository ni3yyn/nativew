// src/hooks/usePendingContributions.js
import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAppContext } from '../context/AppContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'pending_contributions';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const usePendingContributions = (productId) => {
    const { user } = useAppContext();
    const [pendingFields, setPendingFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchPending = useCallback(
        async (forceRefresh = false) => {
            if (!user || !productId) {
                setPendingFields([]);
                setLoading(false);
                return;
            }

            // Check cache
            if (!forceRefresh) {
                try {
                    const cached = await AsyncStorage.getItem(`${CACHE_KEY}_${productId}`);
                    if (cached) {
                        const { data, timestamp } = JSON.parse(cached);
                        if (Date.now() - timestamp < CACHE_DURATION) {
                            setPendingFields(data);
                            setLoading(false);
                            return;
                        }
                    }
                } catch (e) {
                    console.warn('Cache read error:', e);
                }
            }

            setLoading(true);
            setError(null);

            try {
                const q = query(
                    collection(db, 'contributions'),
                    where('userId', '==', user.uid),
                    where('productId', '==', productId),
                    where('status', '==', 'pending')
                );
                const snapshot = await getDocs(q);
                const fields = snapshot.docs.map((doc) => doc.data().field);
                setPendingFields(fields);

                // Update cache
                await AsyncStorage.setItem(
                    `${CACHE_KEY}_${productId}`,
                    JSON.stringify({
                        data: fields,
                        timestamp: Date.now(),
                    })
                );
            } catch (err) {
                console.error('Error fetching pending contributions:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        },
        [user, productId]
    );

    useEffect(() => {
        fetchPending();
    }, [fetchPending]);

    const hasPending = (field) => pendingFields.includes(field);
    const refetch = () => fetchPending(true);

    return { hasPending, loading, error, refetch };
};