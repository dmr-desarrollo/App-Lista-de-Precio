'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  collection,
  query,
  where,
  CollectionReference
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useFirestore, useUser } from '@/firebase/provider';

export type WithId<T> = T & { id: string };

export interface UseCollectionResult<T> {
  data: WithId<T>[] | null; 
  isLoading: boolean;       
  error: FirestoreError | Error | null; 
}

export function useCollection<T = any>(
  targetRefOrQuery: string | Query<DocumentData> | null | undefined,
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  const firestore = useFirestore();
  const { user } = useUser();
  
  useEffect(() => {
    if (!firestore || !user || !targetRefOrQuery) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    let finalQuery: Query;

    if (typeof targetRefOrQuery === 'string') {
        const collectionRef = collection(firestore, targetRefOrQuery);
        finalQuery = query(collectionRef, where('uid', '==', user.uid));
    } else {
        finalQuery = targetRefOrQuery as Query;
    }

    const unsubscribe = onSnapshot(
      finalQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: ResultItemType[] = snapshot.docs.map(doc => ({
          ...(doc.data() as T),
          id: doc.id,
        }));
        setData(results);
        setError(null);
        setIsLoading(false);
      },
      (err: FirestoreError) => {
        const path = (finalQuery as any)._query.path.canonicalString();
        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path: path,
        })
        setError(contextualError);
        setData(null);
        setIsLoading(false);
        errorEmitter.emit('permission-error', contextualError);
      }
    );

    return () => unsubscribe();
  }, [firestore, user, targetRefOrQuery]);

  return { data, isLoading, error };
}
