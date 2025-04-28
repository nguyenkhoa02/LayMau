import React from "react";
import { ImageCard } from "../../../../Components";
import PropTypes from "prop-types";

const ImageList = ({ images, setImages }) => {
  const handleDelete = (directionKey, index) => {
    setImages((prev) => {
      const updatedImages = { ...prev };
      updatedImages[directionKey] = updatedImages[directionKey].filter(
        (_, i) => i !== index,
      );
      return updatedImages;
    });
  };

  return (
    <div className="container mx-auto px-4 grid grid-cols-7 items-center justify-center w-full ">
      {images &&
        Object.keys(images).map((direction) => (
          <div key={direction} className="mb-6 ml-2">
            {/* Direction Title */}
            {/*<h2 className="text-lg font-semibold mb-2 capitalize">*/}
            {/*  {direction}*/}
            {/*</h2>*/}
            {/* Image Row */}
            <div className="flex gap-2 overflow-x-auto">
              {images[direction].map((image, index) => (
                <div
                  key={`${direction}-${index}`}
                  className=" w-[75px] h-[105px] relative"
                >
                  <p>{direction}</p>
                  <ImageCard
                    data={image}
                    onDelete={() => handleDelete(direction, index)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
};

ImageList.propTypes = {
  images: PropTypes.objectOf(PropTypes.arrayOf(PropTypes.string)).isRequired,
  setImages: PropTypes.func.isRequired,
};

export default ImageList;
