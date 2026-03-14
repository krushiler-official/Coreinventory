'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redirect to products list – the create modal is triggered from there
export default function NewProductPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/products?new=1'); }, [router]);
  return null;
}
