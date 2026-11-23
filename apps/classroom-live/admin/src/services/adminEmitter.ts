// Channel đồng bộ thời gian thực giữa Admin và Live Client (0ms latency)
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('classroom_live_sync') : null;

// Quản lý danh sách các popup tab mở riêng biệt
declare global {
  interface Window {
    __classroomPopups?: Window[];
  }
}

export const registerPopupTab = (popup: Window | null) => {
  if (popup && typeof window !== 'undefined') {
    window.__classroomPopups = window.__classroomPopups || [];
    if (!window.__classroomPopups.includes(popup)) {
      window.__classroomPopups.push(popup);
    }
  }
};

/**
 * Gửi dữ liệu tới toàn bộ các đích Client:
 * 1. BroadcastChannel (cùng origin)
 * 2. postMessage tới toàn bộ IFrame đang nhúng (khắc phục 100% sự cố khác Port 8011 vs 8010)
 * 3. postMessage tới các Tab riêng biệt đã mở từ Admin
 */
const dispatchToClients = (payload: Record<string, unknown>) => {
  // 1. BroadcastChannel
  try {
    channel?.postMessage(payload);
  } catch {
    // Ignore error
  }

  // 2. postMessage tới các IFrame nhúng trong trang Admin (Live Client Drawer 9:16)
  if (typeof document !== 'undefined') {
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach((iframe) => {
      try {
        iframe.contentWindow?.postMessage(payload, '*');
      } catch {
        // Ignore error
      }
    });
  }

  // 3. postMessage tới các popup tab đã mở
  if (typeof window !== 'undefined' && Array.isArray(window.__classroomPopups)) {
    for (let i = window.__classroomPopups.length - 1; i >= 0; i--) {
      const win = window.__classroomPopups[i];
      try {
        if (!win || win.closed) {
          window.__classroomPopups.splice(i, 1);
        } else {
          win.postMessage(payload, '*');
        }
      } catch {
        // Ignore error
      }
    }
  }
};

export const emitAdminAction = (action: string, payload: Record<string, unknown> = {}) => {
  const message = {
    type: 'ADMIN_ACTION',
    action,
    payload,
    timestamp: Date.now(),
  };

  dispatchToClients(message);

  // Gửi tới Gateway API port 5000 (nếu có service backend)
  fetch('http://localhost:5000/api/mock/emit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: {
        type: 'ACTION',
        action,
        payload,
        platform: 'mock',
        timestamp: Date.now(),
      },
    }),
  }).catch(() => {
    // Không chặn UI nếu server local chưa bật
  });
};

export const emitLiveEvent = (event: Record<string, unknown>) => {
  const message = {
    type: 'LIVE_EVENT',
    event,
    timestamp: Date.now(),
  };

  dispatchToClients(message);

  // Gửi tới Gateway API port 5000
  fetch('http://localhost:5000/api/mock/emit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event }),
  }).catch(() => {
    // Không chặn UI nếu server local chưa bật
  });
};

export const emitLiveConfig = (config: Record<string, unknown>) => {
  const message = {
    type: 'CONFIG_UPDATE',
    config,
    timestamp: Date.now(),
  };

  dispatchToClients(message);
};
