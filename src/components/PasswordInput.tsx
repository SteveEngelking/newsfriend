import * as React from 'react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/LanguageContext';

const SPECIAL_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

function generateStrongPassword(): string {
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const special = SPECIAL_CHARS;
  const all = lower + upper + digits + special;

  // Guarantee at least one of each category
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  const required = [pick(lower), pick(upper), pick(digits), pick(special)];

  const remaining = Array.from({ length: 12 }, () => pick(all));
  const chars = [...required, ...remaining];

  // Shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (password.length < 8) errors.push('min8');
  if (!/[a-z]/.test(password)) errors.push('lowercase');
  if (!/[A-Z]/.test(password)) errors.push('uppercase');
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) errors.push('special');
  return { valid: errors.length === 0, errors };
}

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showGenerator?: boolean;
  showRequirements?: boolean;
  className?: string;
  id?: string;
}

export function PasswordInput({
  value,
  onChange,
  placeholder,
  showGenerator = false,
  showRequirements = false,
  className,
  id,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const { t } = useLanguage();

  const { errors } = validatePassword(value);
  const hasInput = value.length > 0;

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn('pr-20', className)}
          required
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-0.5">
          {showGenerator && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              tabIndex={-1}
              title={t('passwordGenerate')}
              onClick={() => {
                const pw = generateStrongPassword();
                onChange(pw);
                setVisible(true);
              }}
            >
              <Wand2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            tabIndex={-1}
            title={visible ? t('passwordHide') : t('passwordShow')}
            onClick={() => setVisible(v => !v)}
          >
            {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
      {showRequirements && hasInput && errors.length > 0 && (
        <ul className="text-xs space-y-0.5">
          <li className={errors.includes('min8') ? 'text-destructive' : 'text-green-600'}>
            {t('passwordReqMin8')}
          </li>
          <li className={errors.includes('lowercase') ? 'text-destructive' : 'text-green-600'}>
            {t('passwordReqLower')}
          </li>
          <li className={errors.includes('uppercase') ? 'text-destructive' : 'text-green-600'}>
            {t('passwordReqUpper')}
          </li>
          <li className={errors.includes('special') ? 'text-destructive' : 'text-green-600'}>
            {t('passwordReqSpecial')}
          </li>
        </ul>
      )}
    </div>
  );
}
