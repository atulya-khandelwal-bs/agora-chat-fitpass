import { Product } from "../../../common/types/chat";
import React from "react";
interface FPProductMessageViewProps {
  products: Product[];
  formatCurrency: (amount: number) => string;
}

export default function FPProductMessageView({
  products,
  formatCurrency,
}: FPProductMessageViewProps): React.JSX.Element | null {
  return (
    <div className="fp-product-message">
      {/* Horizontal scrollable product cards */}
      <div className="fp-product-scroll">
        {products.map((p, index) => {
          const productName = p.title || "Product";
          const productImage =
            (p as Product & { image?: string; imageUrl?: string }).image ||
            (p as Product & { image?: string; imageUrl?: string }).image_url;
          const currentPrice = p.selling_amount || p.actual_amount || 0;
          const originalPrice =
            p.actual_amount &&
            p.selling_amount &&
            p.actual_amount !== p.selling_amount
              ? p.actual_amount
              : null;

          return (
            <div
              key={p.action_id || `${p.title}-${index}`}
              className="fp-product-card"
              onClick={() => {
                // Handle product click - redirect to product URL
                if (p.rediection_url) {
                  window.open(
                    p.rediection_url,
                    "_blank",
                    "noopener,noreferrer"
                  );
                } else {
                  console.log("Product clicked (no URL):", p);
                }
              }}
            >
              {/* Product Image - Left Side */}
              <div className="fp-product-image">
                {productImage ? (
                  <img
                    src={productImage}
                    alt={productName}
                    className="fp-product-image-img"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="fp-product-image-empty">No Image</div>
                )}
              </div>

              {/* Product Info - Right Side */}
              <div className="fp-product-info">
                {/* Title */}
                <div className="fp-product-title">
                  {productName}
                </div>

                {/* Description */}
                <div className="fp-product-desc">
                  {p.description || ""}
                </div>

                {/* Bottom Row: Price on Left, Arrow on Right */}
                <div className="fp-product-footer">
                  {/* Price Section - Left */}
                  <div className="fp-product-price">
                    <div className="fp-product-price-current">
                      {formatCurrency(currentPrice)}
                    </div>
                    {originalPrice && (
                      <div className="fp-product-price-old">
                        {formatCurrency(originalPrice)}
                      </div>
                    )}
                  </div>

                  {/* CTA Button or Arrow - Right */}
                  {p.cta_details?.text ||
                  (p.cta_details?.text_color &&
                    (!p.cta_details?.text ||
                      p.cta_details.text.trim() === "")) ? (
                    (() => {
                      // Button text: use text if available and not empty, otherwise use text_color as fallback
                      const buttonText =
                        p.cta_details?.text && p.cta_details.text.trim() !== ""
                          ? p.cta_details.text
                          : p.cta_details?.text_color || "View";

                      // Background color: use bg_color from cta_details with fallback
                      const bgColor = p.cta_details?.bg_color || "#2563eb";

                      // Text color logic:
                      // - If text exists and is not empty: text_color is the actual text color
                      // - If text doesn't exist or is empty: text_color is the button label, so determine text color based on background
                      let textColor = "#FFFFFF"; // Default

                      if (
                        p.cta_details?.text &&
                        p.cta_details.text.trim() !== ""
                      ) {
                        // text exists and is not empty, so text_color is the actual text color
                        textColor = p.cta_details.text_color || "#FFFFFF";
                      } else {
                        // text doesn't exist or is empty, text_color is the button label
                        // Determine text color based on background brightness
                        const isLightBackground =
                          !bgColor ||
                          bgColor === "" ||
                          bgColor === "#FFFFFF" ||
                          bgColor === "#FFF" ||
                          bgColor.toLowerCase() === "white";
                        textColor = isLightBackground ? "#000000" : "#FFFFFF";
                      }

                      // Calculate hover color (darker shade of bg_color)
                      const getHoverColor = (color: string): string => {
                        if (
                          !color ||
                          color === "" ||
                          color === "#FFFFFF" ||
                          color === "#FFF" ||
                          color.toLowerCase() === "white"
                        ) {
                          return "#e5e7eb"; // Light gray hover for white/empty buttons
                        }
                        // Convert hex to RGB and darken by 10%
                        try {
                          const hex = color.replace("#", "");
                          if (
                            hex.length === 6 &&
                            /^[0-9A-Fa-f]{6}$/.test(hex)
                          ) {
                            const r = parseInt(hex.substring(0, 2), 16);
                            const g = parseInt(hex.substring(2, 4), 16);
                            const b = parseInt(hex.substring(4, 6), 16);
                            const darken = (val: number) =>
                              Math.max(0, Math.floor(val * 0.9));
                            return `rgb(${darken(r)}, ${darken(g)}, ${darken(
                              b
                            )})`;
                          }
                        } catch {
                          // If parsing fails, return default
                        }
                        return "#0d7a0d"; // Default hover color
                      };

                      const hoverColor = getHoverColor(bgColor);

                      return (
                        <button
                          className="fp-product-cta"
                          style={{
                            background: bgColor,
                            color: textColor,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle redirect - navigate to product URL
                            if (p.rediection_url) {
                              if (
                                p.rediection_url.startsWith("http://") ||
                                p.rediection_url.startsWith("https://")
                              ) {
                                window.open(
                                  p.rediection_url,
                                  "_blank",
                                  "noopener,noreferrer"
                                );
                              } else {
                                window.location.href = p.rediection_url;
                              }
                            } else {
                              console.log("CTA clicked (no URL):", p);
                            }
                          }}
                          onMouseEnter={(e) => {
                            (
                              e.currentTarget as HTMLButtonElement
                            ).style.background = hoverColor;
                          }}
                          onMouseLeave={(e) => {
                            (
                              e.currentTarget as HTMLButtonElement
                            ).style.background = bgColor;
                          }}
                          aria-label={buttonText}
                        >
                          {buttonText}
                        </button>
                      );
                    })()
                  ) : (
                    <button
                      className="fp-product-arrow"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle redirect - navigate to product URL
                        if (p.rediection_url) {
                          window.open(
                            p.rediection_url,
                            "_blank",
                            "noopener,noreferrer"
                          );
                        } else {
                          console.log("Redirect clicked (no URL):", p);
                        }
                      }}
                      aria-label="View product details"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M6 4L10 8L6 12"
                          stroke="#232534"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
