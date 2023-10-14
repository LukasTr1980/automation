import { Fragment } from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from '../pages/VillaAnna/VillaAnnaHomePage';
import BewaesserungsPage from '../pages/VillaAnna/VillaAnnaBewaesserungPage';
import MarkisePage from '../pages/VillaAnna/VillaAnnaMarkisePage';

const VillaAnnaRoutes = () => {
  return (
    <Fragment>
      <Routes>
        <Route path="/home" element={<HomePage />} />
        <Route path='/bewaesserung' element={<BewaesserungsPage />} />
        <Route path='/markise' element={<MarkisePage />} />
      </Routes>
    </Fragment>
  );
};

export default VillaAnnaRoutes;
