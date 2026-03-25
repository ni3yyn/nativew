// src/services/bountyService.js
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

const FIELD_TO_ACTION_MAP = {
    ingredients: 'ADD_INCI',
    price: 'ADD_PRICE',
    marketingClaims: 'ADD_CLAIMS',
    targetTypes: 'ADD_TARGETS',
    quantity: 'ADD_QUANTITY',
    country: 'ADD_COUNTRY',
    new_product: 'ADD_NEW_PRODUCT',
};

export const submitBounty = async (product, field, proposedValue) => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('User must be logged in to contribute.');

    try {
        console.log(`🚀 [BountyService] Submitting contribution for: ${field}`);

        const contributionRef = doc(collection(db, 'contributions'));
        await setDoc(contributionRef, {
            productId: product?.id || 'new_product',
            field,
            proposedValue,
            userId,
            status: 'pending',
            pointsAwarded: null,
            createdAt: serverTimestamp(),
            reviewedAt: null,
        });

        const actionName = FIELD_TO_ACTION_MAP[field] || 'ADD_DEFAULT';
        // Return pending status – points will be awarded after admin approval
        return { pointsAwarded: 0, isPending: true, actionName };
    } catch (error) {
        console.error('❌ [BountyService] Submission failed:', error);
        throw error;
    }
};

export const submitNewProduct = async (productData) => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('User must be logged in to contribute.');

    try {
        console.log('🚀 [BountyService] Submitting NEW PRODUCT...');

        const contributionRef = doc(collection(db, 'contributions'));
        await setDoc(contributionRef, {
            productId: `TEMP_${Date.now()}`,
            field: 'new_product',
            proposedValue: productData,
            userId,
            status: 'pending',
            pointsAwarded: null,
            createdAt: serverTimestamp(),
            reviewedAt: null,
        });

        return { pointsAwarded: 0, isPending: true, actionName: 'ADD_NEW_PRODUCT' };
    } catch (error) {
        console.error('❌[BountyService] New Product Submission failed:', error);
        throw error;
    }
};