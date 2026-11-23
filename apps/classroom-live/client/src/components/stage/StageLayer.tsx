import React from 'react';

interface StageLayerProps {
  /**
   * Có z-index => layer tạo stacking context riêng (Layer 0, 1, 4, 5).
   * Bỏ trống => con bên trong tự sắp xếp z theo độ sâu chung (Layer 2 và 3).
   */
  zIndex?: number;
  children: React.ReactNode;
}

export const StageLayer: React.FC<StageLayerProps> = ({ zIndex, children }) => (
  <div className="absolute inset-0 pointer-events-none" style={zIndex === undefined ? undefined : { zIndex }}>
    {children}
  </div>
);

export default StageLayer;
