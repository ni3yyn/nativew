// src/services/communityService.js

import { 
  collection, addDoc, updateDoc, doc, arrayUnion, arrayRemove, 
  serverTimestamp, increment, deleteDoc, getDoc 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { AlertService } from './alertService';
import { supabase } from '../config/supabase';
import { t } from '../i18n';

// --- POSTS (SUPABASE) ---

export const createPost = async (payload, firebaseUid, userName, userSettings) => {
  try {
      // 1. Prepare Author Snapshot
      const authorSnapshot = {
          name: userName || t('brand_wathiq_user'),
          skinType: userSettings?.skinType || null,
          scalpType: userSettings?.scalpType || null,
          allergies: userSettings?.allergies || [],
          conditions: userSettings?.conditions || []
      };

      // 🌟 HELPER TO EXTRACT COMPLETE RICH PRODUCT DATA FOR SUPABASE SNAPSHOT
      const extractRichData = (product) => {
          if (!product) return {};

          const resolvedType = product.productType || 
                               product.product_type || 
                               product.type || 
                               product.category?.id || 
                               (typeof product.category === 'string' ? product.category : null) || 
                               product.analysisData?.product_type || 
                               'other';
          const cleanType = typeof resolvedType === 'object' ? (resolvedType.id || 'other') : String(resolvedType);

          const ingredientsList = product.analysisData?.detected_ingredients?.map(i => typeof i === 'object' ? (i.name || i) : i) || 
                                  (Array.isArray(product.ingredients) ? product.ingredients : (typeof product.ingredients === 'string' ? product.ingredients.split(',').map(s => s.trim()) : []));

          return {
              productType: cleanType,
              type: cleanType,
              ingredients: ingredientsList,
              marketingClaims: product.marketingClaims || product.claims || [],
          };
      };

      // 2. Prepare Product Snapshot (Polymorphic)
      let productSnapshot = null;

      if (payload.type === 'journey') {
          productSnapshot = payload.journeyProducts?.map(p => ({
              id: p.id,
              name: p.name || p.productName,
              price: p.price,
              score: p.score || p.analysisData?.oilGuardScore || 0,
              image: p.productImage || p.imageUrl || p.image,
              ...extractRichData(p)
          })) || [];

      } else if (payload.taggedProduct) {
          productSnapshot = {
              id: payload.taggedProduct.id,
              name: payload.taggedProduct.name || payload.taggedProduct.productName,
              imageUrl: payload.taggedProduct.imageUrl || payload.taggedProduct.productImage || payload.taggedProduct.image,
              score: payload.taggedProduct.score || payload.taggedProduct.analysisData?.oilGuardScore || 0,
              ...extractRichData(payload.taggedProduct)
          };
      }

      // 3. Prepare Routine Snapshot
      let routineSnapshot = null;
      if (payload.routineSnapshot) {
          routineSnapshot = {
              am: payload.routineSnapshot.am?.map(p => ({
                  id: p.id,
                  name: p.name || p.productName,
                  image: p.image || p.productImage || p.imageUrl,
                  score: p.score || p.oilGuardScore || 0,
                  ...extractRichData(p)
              })) || [],
              pm: payload.routineSnapshot.pm?.map(p => ({
                  id: p.id,
                  name: p.name || p.productName,
                  image: p.image || p.productImage || p.imageUrl,
                  score: p.score || p.oilGuardScore || 0,
                  ...extractRichData(p)
              })) || []
          };
      }

      // 4. Insert into Supabase
      const { data, error } = await supabase
          .from('posts')
          .insert([
              {
                  firebase_user_id: firebaseUid,
                  type: payload.type,
                  title: payload.title || null,
                  content: payload.content,
                  image_url: payload.imageUrl || null,
                  duration: payload.duration || null,
                  author_snapshot: authorSnapshot,
                  product_snapshot: productSnapshot,
                  routine_snapshot: routineSnapshot,
                  milestones_snapshot: payload.milestones || null
              }
          ])
          .select()
          .single();

      if (error) throw error;
      return data;

  } catch (error) {
      console.error("Error creating post in Supabase:", error);
      throw error;
  }
};

export const deletePost = async (postId) => {
  try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;
  } catch (error) {
      console.error("Delete Post Error:", error);
      AlertService.error(t('alert_error_title'), t('alert_delete_post_error'));
      throw error;
  }
};

export const toggleLikePost = async (postId, userId, isLiked) => {
    try {
        if (isLiked) {
            await supabase.from('likes').delete().match({ post_id: postId, firebase_user_id: userId });
            await supabase.rpc('decrement_likes_count', { row_id: postId });
        } else {
            await supabase.from('likes').insert([{ post_id: postId, firebase_user_id: userId }]);
            await supabase.rpc('increment_likes_count', { row_id: postId });
        }
    } catch (error) {
        console.error("Like Error:", error);
    }
};

// --- SHELF (FIREBASE) ---
export const saveProductToShelf = async (userId, product) => {
  try {
      if (!userId || !product) throw new Error("Invalid parameters");
      const imageToSave = product.image || product.productImage || product.imageUrl || null;
      
      const resolvedType = product.productType || 
                           product.product_type || 
                           product.type || 
                           product.category?.id || 
                           (typeof product.category === 'string' ? product.category : null) || 
                           product.analysisData?.product_type || 
                           'other';
      const cleanType = typeof resolvedType === 'object' ? (resolvedType.id || 'other') : String(resolvedType);

      let hasIngredients = false;
      if (Array.isArray(product.ingredients)) {
          hasIngredients = product.ingredients.length > 0;
      } else if (typeof product.ingredients === 'string') {
          hasIngredients = product.ingredients.trim().length > 0;
      } else if (product.analysisData?.detected_ingredients) {
          hasIngredients = product.analysisData.detected_ingredients.length > 0;
      }

      const rawIngredients = Array.isArray(product.ingredients) 
          ? product.ingredients.join(', ') 
          : (typeof product.ingredients === 'string' ? product.ingredients : (
              Array.isArray(product.analysisData?.raw_ingredients_list) 
                  ? product.analysisData.raw_ingredients_list.join(', ')
                  : (Array.isArray(product.analysisData?.detected_ingredients) 
                      ? product.analysisData.detected_ingredients.map(i => typeof i === 'object' ? i.name : i).join(', ') 
                      : null)
            ));

      // 🌟 IF ANALYSIS DATA HAS SCORE / VERDICT -> MARK STATUS AS 'done' DIRECTLY
      const hasAnalysis = !!(product.analysisData && (product.analysisData.oilGuardScore || product.analysisData.finalVerdict));

      const docRef = await addDoc(collection(db, 'profiles', userId, 'savedProducts'), {
          userId: userId || null,
          productId: product.id || product.productId || null,
          productName: product.name || product.productName || '',
          brand: product.brand || null,
          productImage: imageToSave,
          ingredients: rawIngredients,
          analysisData: product.analysisData || null,
          marketingClaims: Array.isArray(product.marketingClaims) ? product.marketingClaims : (Array.isArray(product.claims) ? product.claims : []),
          productType: cleanType,
          analysisStatus: hasAnalysis ? 'done' : (hasIngredients ? 'pending' : 'no_ingredients'),
          createdAt: serverTimestamp(),
          source: product.source || 'community_share'
      });
      return docRef.id;
  } catch (error) {
      console.error("Save Product Error:", error);
      AlertService.error(t('alert_error_title'), t('alert_save_product_error'));
      throw error;
  }
};

// Background analysis helper
const SHELF_EVALUATE_URL = "https://oilguard-backend.vercel.app/api/evaluate.js";

const _callEvaluate = async (product, userProfile, claims) => {
    let ingredientsList = [];
    if (Array.isArray(product.ingredients)) {
        ingredientsList = product.ingredients.map(s => String(s).trim()).filter(Boolean);
    } else if (typeof product.ingredients === 'string') {
        ingredientsList = product.ingredients.split(',').map(s => s.trim()).filter(Boolean);
    }

    const categoryType = typeof product.category === 'string' 
        ? product.category 
        : (product.category?.id || product.productType || 'other');

    const response = await fetch(SHELF_EVALUATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ingredients_list: ingredientsList,
            product_type: categoryType || 'other',
            selected_claims: claims || [],
            user_profile: {
                allergies: userProfile?.settings?.allergies || [],
                conditions: userProfile?.settings?.conditions || [],
                skinType: userProfile?.settings?.skinType || null,
                scalpType: userProfile?.settings?.scalpType || null,
            }
        })
    });
    if (!response.ok) throw new Error(`Evaluate failed: ${response.status}`);
    return await response.json();
};

export const analyzeAndEnrichShelfProduct = async (userId, shelfDocId, product, userProfile, claims = []) => {
    if (!userId || !shelfDocId) return null;
    const docRef = doc(db, 'profiles', userId, 'savedProducts', shelfDocId);

    try { await updateDoc(docRef, { analysisStatus: 'analyzing' }); } catch (e) {
        console.warn('[ShelfAnalysis] Failed to set analyzing status:', e);
    }

    let result = null;
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            result = await _callEvaluate(product, userProfile, claims);
            if (result) break;
        } catch (e) {
            console.warn(`[ShelfAnalysis] attempt ${attempt + 1} failed:`, e);
            if (attempt === 0) await new Promise(r => setTimeout(r, 1500));
        }
    }

    if (result) {
        try {
            await updateDoc(docRef, {
                analysisData: result,
                marketingClaims: claims.length > 0 ? claims : (product.marketingClaims || []),
                analysisStatus: 'done',
            });
        } catch (e) {
            console.error('[ShelfAnalysis] Failed to update doc:', e);
        }
    } else {
        try { await updateDoc(docRef, { analysisStatus: 'failed' }); } catch (_) {}
    }

    return result;
};

export const markShelfProductNeedsClaims = async (userId, shelfDocId) => {
    if (!userId || !shelfDocId) return;
    try {
        const docRef = doc(db, 'profiles', userId, 'savedProducts', shelfDocId);
        const snap = await getDoc(docRef).catch(() => null);
        if (!snap || !snap.exists()) return;
        await updateDoc(docRef, {
            analysisStatus: 'needs_claims',
        });
    } catch (e) {
        console.warn('[Shelf] markNeedsClaims failed:', e);
    }
};

export const removeProductFromShelf = async (userId, shelfDocId) => {
  try {
      await deleteDoc(doc(db, 'profiles', userId, 'savedProducts', shelfDocId));
  } catch (error) {
      console.error("Remove Product Error:", error);
      throw error;
  }
};

const EVALUATE_ENDPOINT = "https://oilguard-backend.vercel.app/api/evaluate.js"; 

export const reevaluateProductForUser = async (product, userProfile) => {
  try {
      const ingredientsList = product.analysisData?.detected_ingredients?.map(i => typeof i === 'string' ? i : i.name) 
                           || (Array.isArray(product.ingredients) ? product.ingredients : (typeof product.ingredients === 'string' ? product.ingredients.split(',').map(s => s.trim()) : []))
                           || [];
      
      const claims = product.marketingClaims || product.claims || [];
      const type = product.productType || product.type || product.category?.id || product.analysisData?.product_type || 'other';

      if (ingredientsList.length === 0) return null;

      const response = await fetch(EVALUATE_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              ingredients_list: ingredientsList,
              product_type: type,
              selected_claims: claims,
              user_profile: {
                  allergies: userProfile?.settings?.allergies || [],
                  conditions: userProfile?.settings?.conditions || [],
                  skinType: userProfile?.settings?.skinType,
                  scalpType: userProfile?.settings?.scalpType
              }
          })
      });

      if (!response.ok) throw new Error("Analysis failed");
      return await response.json();

  } catch (error) {
      console.error("Re-evaluation error:", error);
      return null;
  }
};

export const deleteComment = async (commentId) => {
  try {
      const { error } = await supabase
          .from('comments')
          .delete()
          .eq('id', commentId);
      if (error) throw error;
  } catch (error) {
      console.error("Delete Comment Error:", error);
      throw error;
  }
};