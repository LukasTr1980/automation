import { useId, useState, type ReactNode, MouseEvent } from 'react';
import { IconButton, Popover, Box, ClickAwayListener } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

type InfoPopoverProps = {
  content: ReactNode;
  ariaLabel: string; // German accessible name
  iconSize?: number;
  // Anchor/placement kept simple: appear above the icon centered
};

export default function InfoPopover({ content, ariaLabel, iconSize = 16 }: InfoPopoverProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const id = useId();

  const handleToggle = (event: MouseEvent<HTMLElement>) => {
    if (open) {
      setAnchorEl(null);
    } else {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleClose = () => setAnchorEl(null);

  return (
    <>
      <IconButton
        size="small"
        aria-label={ariaLabel}
        aria-describedby={open ? id : undefined}
        onClick={handleToggle}
        sx={{ color: 'text.secondary', p: 0.25 }}
      >
        <InfoOutlinedIcon sx={{ fontSize: iconSize }} />
      </IconButton>
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        slotProps={{ paper: { sx: { p: 1, maxWidth: 280 } } }}
      >
        <ClickAwayListener onClickAway={handleClose} mouseEvent="onMouseDown" touchEvent="onTouchStart">
          <Box role="tooltip" sx={{ fontSize: 14, lineHeight: 1.35 }}>
            {content}
          </Box>
        </ClickAwayListener>
      </Popover>
    </>
  );
}
