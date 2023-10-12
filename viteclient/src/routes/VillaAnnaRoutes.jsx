import { Fragment } from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from '../pages/VillaAnna/HomePage';

const VillaAnnaRoutes = () => {
  return (
    <Fragment>
      <Routes>
        <Route path="/villa-anna/home" element={<HomePage />} />
      </Routes>
    </Fragment>
  );
};

export default VillaAnnaRoutes;
