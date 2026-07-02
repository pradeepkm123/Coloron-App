package com.vms.pdf;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.uimanager.SimpleViewManager;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.annotations.ReactProp;

public class PdfViewManager extends SimpleViewManager<PdfView> {
    public static final String REACT_CLASS = "PdfView";

    @NonNull
    @Override
    public String getName() {
        return REACT_CLASS;
    }

    @NonNull
    @Override
    protected PdfView createViewInstance(@NonNull ThemedReactContext reactContext) {
        return new PdfView(reactContext);
    }

    @ReactProp(name = "fileName")
    public void setFileName(PdfView view, @Nullable String fileName) {
        view.setFileName(fileName);
    }

    @ReactProp(name = "pageIndex")
    public void setPageIndex(PdfView view, int pageIndex) {
        view.setPageIndex(pageIndex);
    }

    @Override
    public void onDropViewInstance(@NonNull PdfView view) {
        super.onDropViewInstance(view);
        view.cleanup();
    }
}
