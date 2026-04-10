/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_FrontendConfigAILanguageDto } from './PCode_Application_Contracts_Dto_FrontendConfigAILanguageDto';
import type { PCode_Application_Contracts_Dto_FrontendConfigCommonCommentsDto } from './PCode_Application_Contracts_Dto_FrontendConfigCommonCommentsDto';
import type { PCode_Application_Contracts_Dto_FrontendConfigConfirmDialogDto } from './PCode_Application_Contracts_Dto_FrontendConfigConfirmDialogDto';
import type { PCode_Application_Contracts_Dto_FrontendConfigGeneralSettingsDto } from './PCode_Application_Contracts_Dto_FrontendConfigGeneralSettingsDto';
import type { PCode_Application_Contracts_Dto_FrontendConfigNotificationsDto } from './PCode_Application_Contracts_Dto_FrontendConfigNotificationsDto';
import type { PCode_Application_Contracts_Dto_FrontendConfigProjectIconConfigDto } from './PCode_Application_Contracts_Dto_FrontendConfigProjectIconConfigDto';
import type { PCode_Application_Contracts_Dto_FrontendConfigQuickActionsDto } from './PCode_Application_Contracts_Dto_FrontendConfigQuickActionsDto';
import type { PCode_Application_Contracts_Dto_FrontendConfigSessionPresetsDto } from './PCode_Application_Contracts_Dto_FrontendConfigSessionPresetsDto';
import type { PCode_Application_Contracts_Dto_FrontendConfigSessionSortingDto } from './PCode_Application_Contracts_Dto_FrontendConfigSessionSortingDto';
import type { PCode_Application_Contracts_Dto_FrontendConfigVoiceHotwordDto } from './PCode_Application_Contracts_Dto_FrontendConfigVoiceHotwordDto';
import type { PCode_Application_Contracts_Dto_FrontendConfigVoiceRecognitionDto } from './PCode_Application_Contracts_Dto_FrontendConfigVoiceRecognitionDto';
export type PCode_Application_Contracts_Dto_FrontendConfigSnapshotDto = {
  generalSettings?: PCode_Application_Contracts_Dto_FrontendConfigGeneralSettingsDto;
  aiLanguage?: PCode_Application_Contracts_Dto_FrontendConfigAILanguageDto;
  uiLanguage?: string | null;
  theme?: string | null;
  voiceRecognition?: PCode_Application_Contracts_Dto_FrontendConfigVoiceRecognitionDto;
  voiceHotword?: PCode_Application_Contracts_Dto_FrontendConfigVoiceHotwordDto;
  notifications?: PCode_Application_Contracts_Dto_FrontendConfigNotificationsDto;
  sessionSorting?: PCode_Application_Contracts_Dto_FrontendConfigSessionSortingDto;
  quickActions?: PCode_Application_Contracts_Dto_FrontendConfigQuickActionsDto;
  confirmDialog?: PCode_Application_Contracts_Dto_FrontendConfigConfirmDialogDto;
  sessionPresets?: PCode_Application_Contracts_Dto_FrontendConfigSessionPresetsDto;
  projectIconConfig?: PCode_Application_Contracts_Dto_FrontendConfigProjectIconConfigDto;
  commonComments?: PCode_Application_Contracts_Dto_FrontendConfigCommonCommentsDto;
};

