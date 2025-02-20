import protobufjs, { Type } from 'protobufjs';

let _Message: Type;

export const NucliaProtobufConverter = (buffer: Uint8Array) =>
  new Promise((resolve, reject) => {
    if (_Message) {
      resolve(_Message.decode(buffer));
    } else {
      const root = new protobufjs.Root();
      root.resolvePath = function (origin, target) {
        return target.startsWith('assets/') ? target : `assets/${target}`;
      };
      root.load('assets/nucliadb_protos/writer.proto', function (err) {
        if (err) {
          reject(err);
        }
        _Message = root.lookupType('fdbwriter.BrokerMessage');
        resolve(_Message.decode(buffer));
      });
    }
  });

const BASE64_MARKER = ';base64,';
export const convertDataURIToBinary = (dataURI: string) => {
  const base64 = dataURI.includes(BASE64_MARKER) ? dataURI.split(dataURI)[1] : dataURI;
  const raw = window.atob(base64);
  const rawLength = raw.length;
  const array = new Uint8Array(new ArrayBuffer(rawLength));

  for (let i = 0; i < rawLength; i++) {
    array[i] = raw.charCodeAt(i);
  }
  return array;
};

// By default, paragraphs are just defined by their start and end character positions.
// This function will add in each paragraph object a `text` attribute containing the actual text of the paragraph.
export const extractParagraphTexts = (payload: any) => ({
  ...payload,
  fieldMetadata: payload.fieldMetadata?.map((field: any, index: number) => ({
    ...field,
    metadata: field.metadata
      ? {
          ...field.metadata,
          metadata: field.metadata.metadata
            ? {
                ...field.metadata.metadata,
                paragraphs: field.metadata.metadata.paragraphs?.map((paragraph: any) => ({
                  ...paragraph,
                  text: payload.extractedText
                    ? payload.extractedText[index]?.body?.text?.slice(paragraph.start || 0, paragraph.end).trim()
                    : undefined,
                })),
              }
            : undefined,
        }
      : undefined,
  })),
});
