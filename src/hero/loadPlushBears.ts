import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

type Own = <R extends { dispose(): void }>(resource: R) => R;
export type PlushBears = { cream: any; caramel: any };

/** One local asset; both bears share geometry and textures. */
export async function loadPlushBears(T: any, own: Own): Promise<PlushBears> {
  const gltf = await new GLTFLoader().loadAsync('/hero/cream-teddy-web.glb');
  gltf.scene.traverse((object: any) => {
    if (!object.isMesh) return;
    own(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      own(material);
      for (const value of Object.values(material)) if ((value as any)?.isTexture) own(value as any);
    }
  });
  const cream = gltf.scene.getObjectByName('RIG_cream_teddy');
  if (!cream || !cream.getObjectByName('RIG_head')) throw new Error('The plush bear asset is incomplete.');
  cream.removeFromParent();
  const caramel = cream.clone(true);
  const variants = new Map<string, any>();
  caramel.traverse((object: any) => {
    if (!object.isMesh) return;
    const muzzle = object.name.toLowerCase().includes('muzzle');
    const convert = (original: any) => {
      const key = `${original.uuid}:${muzzle ? 'muzzle' : 'body'}`;
      if (variants.has(key)) return variants.get(key);
      const material = own(original.clone());
      if (original.name === 'MAT_warm_cream_velour' || original.name.startsWith('MAT_fur')) {
        const tint = new T.Color(muzzle ? 0xf8d5b7 : 0xc58a5c);
        if (original.name === 'MAT_fur_web') {
          // The shared vertex colours already contain the cream fibre tones.
          material.color.setRGB(tint.r / .83, tint.g / .73, tint.b / .59);
        } else material.color.copy(tint).multiplyScalar(original.color.r / .83);
      } else if (original.name === 'MAT_muzzle_fleece') material.color.setHex(0xf8d5b7);
      variants.set(key, material);
      return material;
    };
    object.material = Array.isArray(object.material) ? object.material.map(convert) : convert(object.material);
  });
  for (const root of [cream, caramel]) root.traverse((object: any) => {
    if (!object.isMesh) return;
    object.castShadow = !object.name.startsWith('FUR_');
    object.receiveShadow = !object.name.startsWith('FUR_');
  });
  return { cream, caramel };
}
