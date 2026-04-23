import "@typespec/http";

using Http;

@service
namespace ContentNegotiation;

@route("/content-negotiation/same-body-single-operation")
namespace SameBodySingleOperation {
  model PngImage {
    @header contentType: "image/png";
    @body image: bytes;
  }

  model JpegImage {
    @header contentType: "image/jpeg";
    @body image: bytes;
  }

  op getAvatar(@path format: string): PngImage | JpegImage;
}
