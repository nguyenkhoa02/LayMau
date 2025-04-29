import React from "react";
import { ImageCard } from "../../../../Components";
import PropTypes from "prop-types";

const ImageList = ({ images, setImages }) => {
  /**
   * Deletes an image from the specific direction's image list and updates the state.
   * If the direction's image list becomes empty after deletion, a global custom
   * event `directionDeleted` is dispatched.
   *
   * @param {string} directionKey - The key representing the direction (e.g., "left", "right").
   * @param {number} index - The index of the image to be removed from the direction's image list.
   */
  const handleDelete = (directionKey, index) => {
    setImages((prev) => {
      const updatedImages = { ...prev };
      updatedImages[directionKey] = updatedImages[directionKey].filter(
        (_, i) => i !== index,
      );

      if (updatedImages[directionKey].length === 0) {
        // This will update the state in the parent component and be passed down to WebStream3
        window.dispatchEvent(
          new CustomEvent("directionDeleted", {
            detail: { directionKey },
          }),
        );
      }

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
