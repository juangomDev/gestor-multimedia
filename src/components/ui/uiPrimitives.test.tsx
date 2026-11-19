import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FolderOpen } from 'lucide-react';
import { Button } from './Button';
import { Dialog } from './Dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from './DropdownMenu';
import { Popover, PopoverTrigger, PopoverContent } from './Popover';
import { TooltipProvider, Tooltip } from './Tooltip';
import { Switch } from './Switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './Tabs';
import { Input } from './Input';
import { Badge } from './Badge';
import { ShortCodeChip } from './ShortCodeChip';
import { EmptyState } from './EmptyState';
import { Skeleton } from './Skeleton';
import { ToastViewport } from './ToastViewport';
import * as clipboardUtils from '../../utils/clipboard';

const DialogHarness: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Abrir diálogo</Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Compartir carpeta"
        description="Asigna permisos de lectura o edición"
        footer={<Button onClick={() => setOpen(false)}>Listo</Button>}
      >
        <p>Contenido del diálogo</p>
      </Dialog>
    </>
  );
};

describe('Primitivas UI — Sistema "Archivo Editorial" (Fase 1.2)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('Button maneja variantes, loading con aria-busy y deshabilitación', () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <Button variant="primary" onClick={onClick}>
        Subir archivo
      </Button>
    );

    const btn = screen.getByRole('button', { name: 'Subir archivo' });
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <Button variant="primary" loading onClick={onClick}>
        Subir archivo
      </Button>
    );
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
  });

  it('Dialog abre con título/descripción accesibles y cierra al presionar Escape o botón cerrar', async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    await user.click(screen.getByRole('button', { name: 'Abrir diálogo' }));
    expect(screen.getByRole('dialog', { name: 'Compartir carpeta' })).toBeInTheDocument();
    expect(screen.getByText('Contenido del diálogo')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('DropdownMenu y Popover despliegan acciones y ejecutan callbacks', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>Acciones</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Archivo</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem tone="danger" onSelect={onDelete}>
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Popover>
          <PopoverTrigger asChild>
            <Button>Ver info</Button>
          </PopoverTrigger>
          <PopoverContent>
            <span>Bandeja contextual</span>
          </PopoverContent>
        </Popover>
      </>
    );

    await user.click(screen.getByRole('button', { name: 'Acciones' }));
    await user.click(screen.getByRole('menuitem', { name: 'Eliminar' }));
    expect(onDelete).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Ver info' }));
    expect(screen.getByText('Bandeja contextual')).toBeInTheDocument();
  });

  it('Switch, Tabs y Tooltip funcionan con semántica ARIA correcta', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    render(
      <TooltipProvider>
        <Tooltip content="Publicar en widget público">
          <span>
            <Switch checked={false} onCheckedChange={onToggle} ariaLabel="Publicar en IA" />
          </span>
        </Tooltip>

        <Tabs defaultValue="grid">
          <TabsList variant="pills">
            <TabsTrigger value="grid">Cuadrícula</TabsTrigger>
            <TabsTrigger value="list">Lista</TabsTrigger>
          </TabsList>
          <TabsContent value="grid">Vista cuadrícula</TabsContent>
          <TabsContent value="list">Vista lista</TabsContent>
        </Tabs>
      </TooltipProvider>
    );

    const switchEl = screen.getByRole('switch', { name: 'Publicar en IA' });
    expect(switchEl).toHaveAttribute('aria-checked', 'false');
    await user.click(switchEl);
    expect(onToggle).toHaveBeenCalledWith(true);

    expect(screen.getByText('Vista cuadrícula')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Lista' }));
    expect(screen.getByText('Vista lista')).toBeInTheDocument();
  });

  it('Input enlaza label, hint y estado de error accesible', () => {
    render(
      <Input
        label="Nombre de carpeta"
        error="El nombre debe tener al menos 2 caracteres"
        placeholder="ej. Finanzas"
      />
    );

    const input = screen.getByLabelText('Nombre de carpeta');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'El nombre debe tener al menos 2 caracteres'
    );
  });

  it('ShortCodeChip copia la URL al portapapeles sin propagar clic a la tarjeta padre', async () => {
    const parentClick = vi.fn();
    const copySpy = vi.spyOn(clipboardUtils, 'copyToClipboard').mockResolvedValue(true);

    render(
      <div onClick={parentClick}>
        <ShortCodeChip
          prefix="t"
          shortCode="k9x2a"
          copyValue="http://localhost:3000/t/k9x2a"
        />
      </div>
    );

    const chip = screen.getByRole('button', { name: /Copiar enlace t\/k9x2a/i });
    fireEvent.click(chip);

    await waitFor(() => {
      expect(copySpy).toHaveBeenCalledWith('http://localhost:3000/t/k9x2a');
      expect(screen.getByText('Copiado')).toBeInTheDocument();
    });
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('Badge, EmptyState, Skeleton y ToastViewport renderizan estados y permiten descartar alertas', () => {
    const onDismiss = vi.fn();

    render(
      <>
        <Badge tone="ok" artifactDot="table" mono>
          1,420 filas
        </Badge>
        <EmptyState
          icon={<FolderOpen size={20} />}
          title="Carpeta vacía"
          description="Sube archivos o crea una subcarpeta."
          action={<Button variant="primary">Nueva carpeta</Button>}
        />
        <Skeleton variant="card" />
        <ToastViewport
          toasts={[{ id: 't1', title: 'Guardado', message: 'Cambios aplicados', type: 'success' }]}
          onDismiss={onDismiss}
        />
      </>
    );

    expect(screen.getByText('1,420 filas')).toBeInTheDocument();
    expect(screen.getByText('Carpeta vacía')).toBeInTheDocument();
    expect(screen.getByText('Cambios aplicados')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar notificación' }));
    expect(onDismiss).toHaveBeenCalledWith('t1');
  });
});
