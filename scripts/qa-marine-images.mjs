// Capture real loaded official artwork, not a lazy-loading race in full-page screenshots.
import assert from 'node:assert/strict';
import {expect} from '@playwright/test';
export async function waitForBrandImages(page){
 const selector='img[src*="/brand/nereia-logo.png"], img[src*="/brand/sestocontinente"]';
 const found=await page.locator(selector).evaluateAll(images=>{
  const visible=images.filter(i=>i.getClientRects().length);
  for(const image of visible)image.loading='eager';
  return visible.map(image=>image.getAttribute('src'));
 });
 assert.ok(found.some(src=>src.includes('/brand/nereia-logo.png')),'Missing Nereia branding');
 assert.ok(found.some(src=>src.includes('/brand/sestocontinente')),'Missing association branding');
 await expect.poll(()=>page.locator(selector).evaluateAll(images=>images.filter(i=>i.getClientRects().length&&(!i.complete||!i.naturalWidth)).map(i=>i.getAttribute('src'))),{timeout:15000,message:'Official brand images must load before capture'}).toEqual([]);
}
