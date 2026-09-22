import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const scrollToTop = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTo(0, 0);
      if (document.body) document.body.scrollTop = 0;
      const mainContent = document.getElementById('main-content');
      if (mainContent) mainContent.scrollTop = 0;
      const profilePage = document.querySelector('.po-profile-page');
      if (profilePage) profilePage.scrollTop = 0;
      const profileMain = document.querySelector('.po-profile-main');
      if (profileMain) profileMain.scrollTop = 0;
    };

    scrollToTop();
    const timer1 = setTimeout(scrollToTop, 0);
    const timer2 = setTimeout(scrollToTop, 100);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [pathname]);

  return null;
};

export default ScrollToTop;
