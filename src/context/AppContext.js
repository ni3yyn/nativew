import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [savedProducts, setSavedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(null);
  const [productsError, setProductsError] = useState(null);

  useEffect(() => {
    // Listen for Auth Changes
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setProfileError(null);
      setProductsError(null);
      
      if (currentUser) {
        setLoading(true);
        
        // Listen to user profile
        const profileRef = doc(db, 'profiles', currentUser.uid);
        const unsubscribeProfile = onSnapshot(profileRef, 
          (docSnap) => {
            if (docSnap.exists()) {
              setUserProfile(docSnap.data());
              setProfileError(null);
            } else {
              setUserProfile(null);
              // Create initial profile if doesn't exist
              // You might want to add this later
            }
          }, 
          (err) => {
            console.error("Profile fetch error", err);
            setProfileError(err.message);
            setUserProfile(null);
          }
        );

        // Listen to savedProducts subcollection
        const productsRef = collection(db, 'profiles', currentUser.uid, 'savedProducts');
        const productsQuery = query(productsRef, orderBy('createdAt', 'desc'));
        
        const unsubscribeProducts = onSnapshot(productsQuery, 
          (snapshot) => {
            const products = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setSavedProducts(products);
            setProductsError(null);
            setLoading(false);
          }, 
          (err) => {
            console.error("Products fetch error", err);
            setProductsError(err.message);
            setSavedProducts([]);
            setLoading(false);
          }
        );

        return () => {
          unsubscribeProfile();
          unsubscribeProducts();
        };
      } else {
        // No user logged in
        setUserProfile(null);
        setSavedProducts([]);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AppContext.Provider value={{ 
      user, 
      userProfile, 
      savedProducts, 
      setSavedProducts,
      loading,
      profileError,
      productsError,
      logout 
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);