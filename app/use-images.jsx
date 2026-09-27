'use client';
import {useSyncExternalStore} from 'react';
import {subscribeImages,imageRevision} from '../lib/images';
export default function useImages(){return useSyncExternalStore(subscribeImages,imageRevision,()=>0)}
