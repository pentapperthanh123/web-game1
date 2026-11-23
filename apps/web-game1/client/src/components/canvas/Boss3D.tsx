import { Suspense } from 'react';
import { AatroxDarkinBoss } from './AatroxDarkinBoss';
import { ProceduralVoidBaron } from './ProceduralVoidBaron';
import { ModelErrorBoundary } from './ModelErrorBoundary';

export const Boss3D = () => {
  return (
    <ModelErrorBoundary fallback={<ProceduralVoidBaron />}>
      <Suspense fallback={<ProceduralVoidBaron />}>
        <AatroxDarkinBoss />
      </Suspense>
    </ModelErrorBoundary>
  );
};
