'use client';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {legacyCourseTab} from '@/lib/course-ui';
export default function CourseLegacyAnchor(){
 const router=useRouter();
 useEffect(()=>{const url=new URL(window.location.href);if(url.searchParams.has('tab'))return;const tab=legacyCourseTab(url.hash);if(!tab)return;url.searchParams.set('tab',tab);router.replace(url.pathname+url.search,{scroll:false});},[router]);
 return null;
}
