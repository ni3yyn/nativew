import { 
    collection, addDoc, updateDoc, doc, arrayUnion, arrayRemove, 
    serverTimestamp, increment, deleteDoc 
  } from 'firebase/firestore';
  import { db } from '../config/firebase';
  import { AlertService } from './alertService';
  import { supabase } from '../config/supabase';
  
  // --- POSTS (SUPABASE) ---
  
  export const createPost = async (payload, firebaseUid, userName, userSettings) => {
    try {
        // 1. Prepare Author Snapshot
        const authorSnapshot = {
            name: userName || 'مستخدم',
            skinType: userSettings?.skinType || null,
            scalpType: userSettings?.scalpType || null,
            allergies: userSettings?.allergies || [],   // <--- ADDED
            conditions: userSettings?.conditions || []  // <--- ADDED
        };

        // Helper to extract essential rich data (Names Only)
        const extractRichData = (product) => ({
            ingredients: product.analysisData?.detected_ingredients?.map(i => i.name || i) || [],
            marketingClaims: product.marketingClaims || []
        });

        // 2. Prepare Product Snapshot (Polymorphic)
        let productSnapshot = null;

        if (payload.type === 'journey') {
            // 🟢 JOURNEY: Now saves Ingredients/Claims for every product
            productSnapshot = payload.journeyProducts?.map(p => ({
                id: p.id,
                name: p.name,
                price: p.price,
                score: p.score || 0,
                image: p.productImage || p.imageUrl,
                ...extractRichData(p) // <--- THE FIX
            })) || [];

        } else if (payload.taggedProduct) {
            // 🟢 REVIEW: Standard Single Product
            productSnapshot = {
                id: payload.taggedProduct.id,
                name: payload.taggedProduct.name,
                imageUrl: payload.taggedProduct.imageUrl || payload.taggedProduct.productImage,
                score: payload.taggedProduct.score || 0,
                ...extractRichData(payload.taggedProduct) // <--- THE FIX
            };
        }

        // 3. Prepare Routine Snapshot
        // 🟢 ROUTINE: Now saves Ingredients/Claims for AM/PM steps
        let routineSnapshot = null;
        if (payload.routineSnapshot) {
            routineSnapshot = {
                am: payload.routineSnapshot.am?.map(p => ({
                    id: p.id,
                    name: p.name,
                    image: p.image,
                    score: p.score,
                    ...extractRichData(p) // <--- THE FIX
                })) || [],
                pm: payload.routineSnapshot.pm?.map(p => ({
                    id: p.id,
                    name: p.name,
                    image: p.image,
                    score: p.score,
                    ...extractRichData(p) // <--- THE FIX
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
          AlertService.error("خطأ", "تعذر حذف المنشور.");
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
        const imageToSave = product.productImage || product.imageUrl || null;
        await addDoc(collection(db, 'profiles', userId, 'savedProducts'), {
            userId,
            productName: product.name || product.productName,
            productImage: imageToSave,
            analysisData: product.analysisData, 
            marketingClaims: product.marketingClaims || [],
            productType: product.productType || product.analysisData?.product_type || 'other',
            createdAt: serverTimestamp(),
            source: 'community_save'
        });
    } catch (error) {
        console.error("Save Product Error:", error);
        AlertService.error("خطأ", "تعذر حفظ المنتج في الرف.");
        throw error;
    }
  };

  const EVALUATE_ENDPOINT = "https://oilguard-backend.vercel.app/api/evaluate.js"; 

  export const reevaluateProductForUser = async (product, userProfile) => {
    try {
        // Handle various input structures (Flat vs Nested)
        const ingredientsList = product.analysisData?.detected_ingredients?.map(i => typeof i === 'string' ? i : i.name) 
                             || product.ingredients 
                             || [];
        
        const claims = product.marketingClaims || [];
        const type = product.productType || product.analysisData?.product_type || 'other';

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