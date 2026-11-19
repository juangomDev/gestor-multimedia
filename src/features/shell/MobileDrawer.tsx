import React, { useState } from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { Menu, Search, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Sidebar } from './Sidebar';
import { useShell } from './useShell';
import styles from './MobileDrawer.module.css';

/**
 * Barra superior compacta y drawer lateral accesible sobre Radix Dialog
 * para navegación responsiva en pantallas menores a `900px`.
 */
export const MobileDrawer: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { openCommandPalette } = useShell();

  return (
    <>
      <header className={styles.mobileBar}>
        <div className={styles.leftGroup}>
          <Button
            variant="ghost"
            size="icon"
            icon={<Menu size={18} />}
            aria-label="Abrir menú de navegación"
            onClick={() => setOpen(true)}
          />
          <span className={styles.brandText}>Bóveda</span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          icon={<Search size={17} />}
          aria-label="Abrir paleta rápida"
          onClick={openCommandPalette}
        />
      </header>

      <RadixDialog.Root open={open} onOpenChange={setOpen}>
        <RadixDialog.Portal>
          <RadixDialog.Overlay className={styles.overlay} />
          <RadixDialog.Content className={styles.drawer} aria-label="Menú lateral">
            <RadixDialog.Title className="sr-only">Navegación principal</RadixDialog.Title>
            <RadixDialog.Description className="sr-only">
              Menú lateral responsive para navegar entre secciones del espacio.
            </RadixDialog.Description>
            <div className={styles.drawerClose}>
              <RadixDialog.Close asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  icon={<X size={16} />}
                  aria-label="Cerrar menú lateral"
                />
              </RadixDialog.Close>
            </div>
            <Sidebar inDrawer onNavigate={() => setOpen(false)} />
          </RadixDialog.Content>
        </RadixDialog.Portal>
      </RadixDialog.Root>
    </>
  );
};
