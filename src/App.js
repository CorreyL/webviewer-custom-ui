import React, { useRef, useEffect, useState } from 'react';
import ReactQuill from 'react-quill';
import Modal from 'simple-react-modal';
import SearchContainer from './components/SearchContainer';
import { ReactComponent as ZoomIn } from './assets/icons/ic_zoom_in_black_24px.svg';
import { ReactComponent as ZoomOut } from './assets/icons/ic_zoom_out_black_24px.svg';
import { ReactComponent as AnnotationRectangle } from './assets/icons/ic_annotation_square_black_24px.svg';
import { ReactComponent as AnnotationRedact } from './assets/icons/ic_annotation_add_redact_black_24px.svg';
import { ReactComponent as AnnotationApplyRedact} from './assets/icons/ic_annotation_apply_redact_black_24px.svg';
import { ReactComponent as Search } from './assets/icons/ic_search_black_24px.svg';
import { ReactComponent as Select } from './assets/icons/ic_select_black_24px.svg';
import { ReactComponent as EditContent } from './assets/icons/ic_edit_page_24px.svg';
import './App.css';
import 'react-quill/dist/quill.snow.css';

/**
 * Intended to be used with the Array.sort method, assuming all elements of
 * the Array consist of the Core.Annotations.Annotation class
 */
  const annotationAccessibilitySortingAlgorithm = (a, b) => {
  if (a.PageNumber < b.PageNumber) {
    return -1;
  } else if (a.PageNumber > b.PageNumber) {
    return 1;
  }
  // PageNumber is equal, check Y coordinates
  if (a.Y < b.Y) {
    return -1;
  } else if (a.Y > b.Y) {
    return 1;
  }
  // Y coordinates are equal, check X coordinates
  if (a.X < b.X) {
    return -1;
  } else if (a.X > b.X) {
    return 1;
  }
  return 0
}

const App = () => {
  const viewer = useRef(null);
  const scrollView = useRef(null);
  const searchTerm = useRef(null);
  const searchContainerRef = useRef(null);

  const [documentViewer, setDocumentViewer] = useState(null);
  const [annotationManager, setAnnotationManager] = useState(null);
  const [searchContainerOpen, setSearchContainerOpen] = useState(false);

  const [editBoxAnnotation, setEditBoxAnnotation] = useState(null);
  const [editBoxCurrentValue, setEditBoxCurrentValue] = useState(null);

  const [sortedAnnotations, setSortedAnnotations] = useState([]);
  const [selectedAnnotationIdx, setSelectedAnnotationIdx] = useState(null);

  const Annotations = window.Core.Annotations;

  // if using a class, equivalent of componentDidMount
  useEffect(() => {
    const Core = window.Core;
    Core.setWorkerPath('/webviewer');
    Core.enableFullPDF();

    const documentViewer = new Core.DocumentViewer();
    documentViewer.setScrollViewElement(scrollView.current);
    documentViewer.setViewerElement(viewer.current);
    documentViewer.setOptions({ enableAnnotations: true });
    documentViewer.loadDocument('/files/pdftron_about.pdf');

    setDocumentViewer(documentViewer);

    const getAndSetSortedAnnotations = () => {
      setSortedAnnotations(
        documentViewer.getAnnotationManager()
          .getAnnotationsList()
          .sort(annotationAccessibilitySortingAlgorithm)
      );
    };

    documentViewer.addEventListener('documentLoaded', () => {
      console.log('document loaded');
      documentViewer.setToolMode(documentViewer.getTool(Core.Tools.ToolNames.EDIT));
      setAnnotationManager(documentViewer.getAnnotationManager());
      documentViewer.getAnnotationManager().promoteUserToAdmin();
    });

    documentViewer
      .addEventListener('annotationsLoaded', () => {
        getAndSetSortedAnnotations();
      });
  }, []);

  useEffect(() => {
    if (annotationManager) {
      annotationManager.removeEventListener('annotationSelected.setSelectedAnnotation');
      annotationManager.addEventListener('annotationSelected.setSelectedAnnotation', (annot, action) => {
        if (action === 'deselected') {
          setSelectedAnnotationIdx(null);
        }
        if (action === 'selected') {
          setSelectedAnnotationIdx(
            sortedAnnotations
              .findIndex(sortedAnnot => sortedAnnot.Id === annot[0].Id)
          );
        }
      });
    }
  }, [annotationManager, sortedAnnotations]);

  const zoomOut = () => {
    documentViewer.zoomTo(documentViewer.getZoom() - 0.25);
  };

  const zoomIn = () => {
    documentViewer.zoomTo(documentViewer.getZoom() + 0.25);
  };

  const startEditingContent = () => {
    const contentEditTool = documentViewer.getTool(window.Core.Tools.ToolNames.CONTENT_EDIT);
    documentViewer.setToolMode(contentEditTool);
  };

  const createRectangle = () => {
    documentViewer.setToolMode(documentViewer.getTool(window.Core.Tools.ToolNames.RECTANGLE));
  };

  const selectTool = () => {
    documentViewer.setToolMode(documentViewer.getTool(window.Core.Tools.ToolNames.EDIT));
  };

  const createRedaction = () => {
    documentViewer.setToolMode(documentViewer.getTool(window.Core.Tools.ToolNames.REDACTION));
  };

  const applyRedactions = async () => {
    const annotationManager = documentViewer.getAnnotationManager();
    annotationManager.enableRedaction();
    await annotationManager.applyRedactions();
  };

  const richTextEditorChangeHandler = (value) => {
    setEditBoxCurrentValue(value);
  };

  const applyEditModal = () => {
    window.Core.ContentEdit.updateDocumentContent(editBoxAnnotation, editBoxCurrentValue);

    setEditBoxAnnotation(null);
    setEditBoxCurrentValue(null);
  };

  const editSelectedBox = async () => {
    const selectedAnnotations = documentViewer.getAnnotationManager().getSelectedAnnotations();
    const selectedAnnotation = selectedAnnotations[0];

    if (selectedAnnotation &&
      selectedAnnotation.isContentEditPlaceholder() &&
      selectedAnnotation.getContentEditType() === window.Core.ContentEdit.Types.TEXT) {
      const content = await window.Core.ContentEdit.getDocumentContent(selectedAnnotation);
      setEditBoxAnnotation(selectedAnnotation);
      setEditBoxCurrentValue(content);
    } else {
      alert('Text edit box is not selected');
    }
  };

  const toolbarOptions = [['bold', 'italic', 'underline']];

  /**
   * @todo This is a re-definition of this method that exists inside of a
   * useEffect above. It was non-trivial to define the method outside of the
   * useEffect due to some React limitations, and this implementation was
   * time-constrained, and therefore I've opted to re-define the same method
   * outside of the useEffect for now
   */
  const getAndSetSortedAnnotations = () => {
    if (!documentViewer) {
      return;
    }
    setSortedAnnotations(
      documentViewer.getAnnotationManager()
        .getAnnotationsList()
        .sort(annotationAccessibilitySortingAlgorithm)
    );
  };

  const previousAnnotation = () => {
    annotationManager.deselectAllAnnotations();
    getAndSetSortedAnnotations();
    if (
      selectedAnnotationIdx === null
      || selectedAnnotationIdx - 1 === -1
    ) {
      const idxToSet = sortedAnnotations.length - 1;
      setSelectedAnnotationIdx(idxToSet);
      annotationManager.selectAnnotation(sortedAnnotations[idxToSet]);
      return;
    }
    annotationManager.selectAnnotation(sortedAnnotations[selectedAnnotationIdx - 1]);
    setSelectedAnnotationIdx(selectedAnnotationIdx - 1);
  };

  const nextAnnotation = () => {
    annotationManager.deselectAllAnnotations();
    getAndSetSortedAnnotations();
    if (
      selectedAnnotationIdx === null
      || selectedAnnotationIdx + 1 === sortedAnnotations.length
    ) {
      const idxToSet = 0;
      setSelectedAnnotationIdx(idxToSet);
      annotationManager.selectAnnotation(sortedAnnotations[idxToSet]);
      return;
    }
    annotationManager.selectAnnotation(sortedAnnotations[selectedAnnotationIdx + 1]);
    setSelectedAnnotationIdx(selectedAnnotationIdx + 1);
  };

  return (
    <div className="App">
      <div id="main-column">
        <div className="center" id="tools">
          <button onClick={zoomOut}>
            <ZoomOut />
          </button>
          <button onClick={zoomIn}>
            <ZoomIn />
          </button>
          <button onClick={startEditingContent} title="Switch to edit mode">
            <EditContent />
          </button>
          <button onClick={editSelectedBox} title="Edit selected box">
            Edit Box
          </button>
          <button onClick={createRectangle}>
            <AnnotationRectangle />
          </button>
          <button onClick={createRedaction}>
            <AnnotationRedact />
          </button>
          <button onClick={applyRedactions}>
            <AnnotationApplyRedact />
          </button>
          <button onClick={selectTool}>
            <Select />
          </button>
          <button
            onClick={() => {
              // Flip the boolean
              setSearchContainerOpen(prevState => !prevState);
            }}
          >
            <Search />
          </button>
          <button onClick={previousAnnotation}>
            Prev Annot
          </button>
          <button onClick={nextAnnotation}>
            Next Annot
          </button>
        </div>
        <Modal show={!!editBoxCurrentValue} style={{ background: 'rgba(0, 0, 0, 0.2)' }}>
          <ReactQuill
            value={editBoxCurrentValue}
            onChange={richTextEditorChangeHandler}
            modules={{ toolbar: toolbarOptions }}
          />
          <button onClick={applyEditModal}>
            Apply
          </button>
        </Modal>
        <div className="flexbox-container" id="scroll-view" ref={scrollView}>
          <div id="viewer" ref={viewer}></div>
        </div>
      </div>
      <div className="flexbox-container">
        <SearchContainer
          Annotations={Annotations}
          annotationManager={annotationManager}
          documentViewer={documentViewer}
          searchTermRef={searchTerm}
          searchContainerRef={searchContainerRef}
          open={searchContainerOpen}
        />
      </div>
    </div>
  );
};

export default App;
