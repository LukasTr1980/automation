import { useState, useEffect } from 'react';

const usePreloadImages = (imageUrls: string[]): boolean => {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const images: HTMLImageElement[] = [];
        let loadedImages = 0;

        const onImageLoad = () => {
            loadedImages += 1;
            if (loadedImages === imageUrls.length) {
                setIsLoading(false);
            }
        };

        imageUrls.forEach((url) => {
            const img = new Image();
            img.src = url;
            img.onload = onImageLoad;
            img.onerror = onImageLoad;
            images.push(img);
        });

        return () => images.forEach(img => {
            img.onload = null;
            img.onerror = null;
        });
    }, [imageUrls]);

    return isLoading;
};

export default usePreloadImages;