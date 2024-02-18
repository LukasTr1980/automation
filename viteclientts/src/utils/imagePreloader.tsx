import React from 'react';
import usePreloadImages from './usePreloadImages';
import LoadingSpinner from '../components/LoadingSpinner';
import { ImagePreloaderProps } from '../types/types'; 

const ImagePreloader: React.FC<ImagePreloaderProps> = ({ imageUrls, children }) => {
    const isLoading = usePreloadImages(imageUrls);

    if (isLoading) {
        return <LoadingSpinner />;
    }

    return <>{children}</>
};

export default ImagePreloader;
