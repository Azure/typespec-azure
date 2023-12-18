import "../dist/src/index.js";

using TypeSpec.Reflection;
namespace Azure.Portal;

extern dec about(target: Model, options: AboutOptions);
extern dec browse(target: Model, options: BrowseOptions);
extern dec marketplaceOffer(target:Model, options: marketplaceOfferOptions);
extern dec displayName(target: ModelProperty, name: valueof string);

//extern dec essentials(target: ModelProperty);

//extern dec patternValidationMessage(target: ModelProperty, message: valueof string);

model BrowseOptions {
    argQuery?: string | FilePath
}

model FilePath {
    filePath: string
}
model marketplaceOfferOptions {
    id?: string;
}
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        
model AboutOptions {
    icon?: FilePath;
    displayName?: string;
    keywords?: string[];
    learnMoreDocs?: string[];
}
