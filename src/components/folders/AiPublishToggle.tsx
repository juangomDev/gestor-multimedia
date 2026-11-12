/**
 * Interruptor de publicación de una carpeta en el Widget de Chat Web Público (`ai_manager`).
 * @module components/folders/AiPublishToggle
 */

import React, { useState } from 'react';
import { Bot } from 'lucide-react';
import { foldersService } from '../../services/foldersService';
import { useToast } from '../../context/useToast';
import type { ApiFolderShare } from '../../types/api';
import type { User } from '../../types/auth';

/** Nombre de usuario fijo de la cuenta de servicio del chat público en `monolith-backend`. */
export const AI_MANAGER_USERNAME = 'ai_manager';

/**
 * Propiedades del interruptor de publicación `ai_manager`.
 */
export interface AiPublishToggleProps {
  /** ID de la carpeta a publicar/despublicar */
  folderId: string;
  /** Usuarios disponibles (de `GET /api/v1/users`), donde se busca a `ai_manager` */
  users: User[];
  /** Miembros actuales de la carpeta (de `GET /api/v1/folders/:id/shares`) */
  shares: ApiFolderShare[];
  /** Actualiza la lista local de miembros tras publicar o despublicar */
  setShares: React.Dispatch<React.SetStateAction<ApiFolderShare[]>>;
  /** Callback opcional tras un cambio exitoso */
  onChanged?: () => void;
}

/**
 * Determina si un share pertenece a la cuenta `ai_manager`.
 */
const isAiShare = (share: ApiFolderShare, aiUserId?: string): boolean =>
  share.user?.username === AI_MANAGER_USERNAME ||
  Boolean(aiUserId && (share.userId || share.user?.id) === aiUserId);

/**
 * Interruptor de un clic que comparte la carpeta con `ai_manager` en modo `READ`
 * (`POST /api/v1/folders/:id/shares`) o revoca su acceso (`DELETE /api/v1/folders/:id/shares/:userId`).
 */
export const AiPublishToggle: React.FC<AiPublishToggleProps> = ({
  folderId,
  users,
  shares,
  setShares,
  onChanged,
}) => {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  const aiShare = shares.find((s) => isAiShare(s));
  const aiUser = users.find((u) => u.username === AI_MANAGER_USERNAME);
  const aiUserId = aiUser?.id || aiShare?.userId || aiShare?.user?.id;
  const isPublished = shares.some((s) => isAiShare(s, aiUserId));

  /**
   * Publica o despublica la carpeta en el chat web público.
   */
  const handleToggle = async () => {
    if (!aiUserId || busy) return;
    setBusy(true);
    try {
      if (isPublished) {
        await foldersService.revokeShare(folderId, aiUserId);
        setShares((prev) => prev.filter((s) => !isAiShare(s, aiUserId)));
        showToast('Carpeta retirada del Chat Web Público', 'info');
      } else {
        const created = await foldersService.shareFolder(folderId, aiUserId, 'READ');
        setShares((prev) => [
          ...prev,
          {
            ...created,
            userId: created?.userId || aiUserId,
            permission: 'READ',
            user: created?.user || { id: aiUserId, username: AI_MANAGER_USERNAME, role: 'MANAGER' },
          },
        ]);
        showToast('Carpeta publicada en el Chat Web Público', 'success');
      }
      onChanged?.();
    } catch (err: unknown) {
      const e = err as { detail?: string; message?: string };
      showToast(e?.detail || e?.message || 'No se pudo cambiar la publicación', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <label
      data-testid="ai-publish-toggle"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '10px 12px',
        borderRadius: 'var(--radius-md)',
        border: `1px solid ${isPublished ? 'rgba(16, 185, 129, 0.45)' : 'var(--border-subtle)'}`,
        background: isPublished ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
        cursor: aiUserId ? 'pointer' : 'not-allowed',
        opacity: aiUserId ? 1 : 0.6,
      }}
      title={aiUserId ? undefined : 'La cuenta de servicio ai_manager no está disponible'}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Bot size={16} style={{ color: isPublished ? '#34d399' : 'var(--text-muted)' }} />
        <span style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.83rem', fontWeight: 600 }}>
            Publicar en Widget de Chat Web Público
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {isPublished
              ? 'Visible para el asistente público (ai_manager · Lectura)'
              : 'Solo usuarios internos pueden consultar esta carpeta'}
          </span>
        </span>
      </span>
      <input
        type="checkbox"
        role="switch"
        aria-label="Publicar en Widget de Chat Web Público (ai_manager)"
        aria-checked={isPublished}
        checked={isPublished}
        disabled={!aiUserId || busy}
        onChange={() => void handleToggle()}
      />
    </label>
  );
};

