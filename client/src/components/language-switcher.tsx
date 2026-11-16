'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Languages } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';

const languages = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
];

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const [currentLocale, setCurrentLocale] = useState('en');

  useEffect(() => {
    // Extract current locale from pathname
    const locale = pathname.split('/')[1];
    if (locale === 'en' || locale === 'vi') {
      setCurrentLocale(locale);
    }
  }, [pathname]);

  const changeLang = (locale: string) => {
    const pathWithoutLocale = pathname.replace(/^\/(en|vi)/, '');
    router.push(`/${pathWithoutLocale}`);
    setCurrentLocale(locale);
  };

  const currentLanguage = useMemo(
    () => languages.find((lang) => lang.code === currentLocale),
    [currentLocale],
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant='ghost' size='icon' className='outline'>
          <span className='h-[1.2rem] w-[1.2rem]'>{currentLanguage?.flag}</span>
          <span className='sr-only'>Switch language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align='end'
        className='bg-background text-foreground'
      >
        <DropdownMenuRadioGroup
          value={currentLocale}
          onValueChange={changeLang}
        >
          {languages.map((lang) => (
            <DropdownMenuRadioItem key={lang.code} value={lang.code}>
              <span className='mr-2'>{lang.flag}</span>
              {lang.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
