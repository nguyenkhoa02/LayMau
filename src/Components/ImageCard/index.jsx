import React from "react";
import { X } from "lucide-react";
import PropTypes from "prop-types";

function ImageCard({ data, onDelete }) {
  return (
    <div className="group relative overflow-hidden rounded-lg bg-white shadow-md transition-transform hover:-translate-y-1">
      <div className="aspect-square overflow-hidden">
        {data ? (
          <div>
            <button
              onClick={() => onDelete()}
              className="absolute right-2 top-2 z-10 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
              aria-label="Remove image"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={data}
              alt="Face"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="flex justify-center items-center h-full text-gray-500">
            No face detected
          </div>
        )}
      </div>
    </div>
  );
}

ImageCard.propTypes = {
  data: PropTypes.array.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default ImageCard;
