import { 
    collection, addDoc, updateDoc, doc, arrayUnion, arrayRemove, 
    serverTimestamp, increment, deleteDoc 
  } from 'firebase/firestore';
  import { db } from '../config/firebase';
  import { AlertService } from './alertService';
  
  // --- POSTS ---
  
  export const createPost = async (postData, userId, userName, authorSettings) => {
      try {
          return await addDoc(collection(db, 'posts'), {
              ...postData,
              userId,
              userName,
              authorSettings,
              likes: [],
              likesCount: 0,
              commentsCount: 0,
              createdAt: serverTimestamp()
          });
      } catch (error) {
          console.error("Create Post Error:", error);
          AlertService.error("خطأ", "فشل في نشر المنشور. يرجى المحاولة مرة أخرى.");
          throw error;
      }
  };
  
  export const deletePost = async (postId) => {
      try {
          await deleteDoc(doc(db, 'posts', postId));
      } catch (error) {
          console.error("Delete Post Error:", error);
          AlertService.error("خطأ", "تعذر حذف المنشور.");
          throw error;
      }
  };
  
  export const toggleLikePost = async (postId, userId, isLiked) => {
      // Optimistic updates usually don't need error alerts unless critical
      const postRef = doc(db, 'posts', postId);
      try {
          if (isLiked) {
              await updateDoc(postRef, { 
                  likes: arrayRemove(userId), 
                  likesCount: increment(-1) 
              });
          } else {
              await updateDoc(postRef, { 
                  likes: arrayUnion(userId), 
                  likesCount: increment(1) 
              });
          }
      } catch (error) {
          console.error("Like Error:", error);
      }
  };
  
  // --- COMMENTS ---
  
  export const addComment = async (postId, text, user) => {
      try {
          // Robust Name Extraction
          const userName = user?.settings?.name || user?.name || 'مستخدم وثيق';
          
          await addDoc(collection(db, 'posts', postId, 'comments'), {
              text,
              userId: user.uid,
              userName: userName, 
              likes: [],
              createdAt: serverTimestamp()
          });
  
          await updateDoc(doc(db, 'posts', postId), { 
              commentsCount: increment(1) 
          });
      } catch (error) {
          console.error("Add Comment Error:", error);
          AlertService.error("خطأ", "تعذر إضافة التعليق.");
          throw error;
      }
  };
  
  export const deleteComment = async (postId, commentId) => {
      try {
          await deleteDoc(doc(db, 'posts', postId, 'comments', commentId));
          await updateDoc(doc(db, 'posts', postId), { 
              commentsCount: increment(-1) 
          });
      } catch (error) {
          console.error("Delete Comment Error:", error);
          AlertService.error("خطأ", "تعذر حذف التعليق.");
          throw error;
      }
  };
  
  export const likeComment = async (postId, commentId, userId) => {
      try {
          const ref = doc(db, 'posts', postId, 'comments', commentId);
          await updateDoc(ref, { likes: arrayUnion(userId) });
      } catch (error) {
          console.error("Comment Like Error:", error);
      }
  };
  
  export const unlikeComment = async (postId, commentId, userId) => {
      try {
          const ref = doc(db, 'posts', postId, 'comments', commentId);
          await updateDoc(ref, { likes: arrayRemove(userId) });
      } catch (error) {
          console.error("Comment Unlike Error:", error);
      }
  };
  
  // --- SHELF ---
  
  export const saveProductToShelf = async (userId, product) => {
    try {
        // Normalize the image URL (Handle both Shelf format and Post format)
        const imageToSave = product.productImage || product.imageUrl || null;

        await addDoc(collection(db, 'profiles', userId, 'savedProducts'), {
            userId,
            productName: product.name || product.productName, // Handle both naming conventions
            productImage: imageToSave, // ✅ CRITICAL FIX: Ensures image is saved
            
            // Save the specific analysis (Original or Personalized)
            analysisData: product.analysisData, 
            marketingClaims: product.marketingClaims || [], // Save claims for future reference
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
        // 1. Prepare Data
        // Use saved ingredients from the original analysis
        const ingredientsList = product.analysisData?.detected_ingredients?.map(i => typeof i === 'string' ? i : i.name) || [];
        
        // Use saved claims (or empty array if old post)
        const claims = product.marketingClaims || [];
        const type = product.productType || 'other';

        // 2. Call Backend
        const response = await fetch(EVALUATE_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ingredients_list: ingredientsList,
                product_type: type,
                selected_claims: claims, // reusing original claims
                user_profile: {
                    allergies: userProfile?.settings?.allergies || [],
                    conditions: userProfile?.settings?.conditions || [],
                    skinType: userProfile?.settings?.skinType,
                    scalpType: userProfile?.settings?.scalpType
                }
            })
        });

        if (!response.ok) throw new Error("Analysis failed");
        
        const newData = await response.json();
        return newData; // This contains the NEW score for THIS user

    } catch (error) {
        console.error("Re-evaluation error:", error);
        return null;
    }
};