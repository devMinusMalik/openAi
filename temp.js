import React, { useState, useEffect, useRef } from 'react';
import {
  Grid,
  Button,
  IconButton,
  Typography,
  FormControl,
  RadioGroup,
  Radio,
  FormControlLabel,
} from '@mui/material';

import FormsTitle from '../../components/Shared/FormsTitle';
import axios from 'axios';
import { uniq } from 'lodash';

import { useForm, useFieldArray } from 'react-hook-form';

import BsiDynamicRow from '../../components/Widgets/Bsi/BsiDynamicRow';
import BsiSecondRow from '../../components/Widgets/Bsi/BsiSecondRow';
import BsiTopRow from '../../components/Widgets/Bsi/BsiTopRow';
import ButtonComp from '../../components/Shared/ButtonComp';
import { useRouter } from 'next/router';
import { CSVLink } from 'react-csv';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getUniqueArray } from '../../components/Helpers/globalFuncs/globalArrFuncs';
import MessageComp from '../../components/Shared/MessageComp';
import DepFiltrationRow from '../../components/Shared/DepFiltrationRow';
import { ImEye } from 'react-icons/im';
import {
  convertDateToISO,
  getMonthShortName,
} from '../../components/Helpers/globalFuncs/globalDateFuncs';
import {
  bsiCSVHeaderTitles,
  bsiCsvHeaders,
} from '../../components/Helpers/StaticData/CsvHeaders';
import {
  monthNameShort,
  noOptionAvail,
} from '../../components/Helpers/StaticData/StaticLists';
import {
  handleSubmitMsgFunc,
  handleEditMsgFunc,
  handleDeleteMsgFunc,
  handleErrMsgFunc,
} from '../../components/Helpers/globalFuncs/globalMsgFuncs';

import {
  handleNextClickFunc,
  handlePreviousClickFunc,
} from '../../components/Helpers/globalFuncs';
import DynamicFormTopRow from '../../components/Sections/SharedSections/DynamicFormTopRow';
import DynamicFormTwoDates from '../../components/Sections/SharedSections/DynamicFormTwoDates';
import DoubleRadioButtonWithTooltip from '../../components/Widgets/SharedWidgets/RadioButtons/DoubleRadioButtonWithTooltip';
import ButtonsRowComp from '../../components/Sections/SharedSections/ButtonsRowComp';
import DepFiltrationRowComp from '../../components/Sections/SharedSections/DepFiltrationRowComp';
import {
  fetchCompleteRecordsList,
  fetchDropdownList,
} from '../../components/Helpers/apiCalls/globalApiCalls';
import nextConfig from 'next/config';
const apiUrl = nextConfig().publicRuntimeConfig.PKLI_API_URL;

let styles = {
  radioButtonStyles: {
    marginRight: '11px',
    '& .MuiSvgIcon-root': { height: 15, width: 15 },
    '& .MuiButtonBase-root': {
      padding: '5px',
      paddingLeft: '9px',
    },
  },
  fontSize: {
    xs: '11px',
    sm: '12px',
    md: '13px',
    lg: '14px',
  },
};

const Bsi = ({}) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
    control,
  } = useForm({
    defaultValues: {
      bsiForm: {
        patientName: '',
        patient: '',
        patient_name: 'Select Name',
        mrn: 'Select MRN',
        age: '',
        department: '',
        departmentList: [],
        patientList: [],
        tempBsiArr: [],
        completeLogsArr: [],
        invasive_line_insertion: new Date().toISOString().slice(0, 10),
        invasive_line_removal: new Date().toISOString().slice(0, 10),
        has_removal_date: false,

        allogenicStemCheck: false,
        grade: false,
        phlebitisCheck: false,
        phlebitis: false,
        counter: 0,
        hasPrevious: false,
        hasNext: false,
        tempRecordId: '',
        finalBsiArrForFiltration: [],
        finalIcuArrForFiltration: [],
        finalIcuDataSet: [],
        finalMonthNamesArr: [],
        filterDepartment: '',
        filterStartDate: new Date(),
        filterEndDate: new Date(),
        showChart: false,
      },
    },
  });

  const { append, fields, remove } = useFieldArray({
    control,
    name: 'bsiForm_dynamicRow',
  });

  const lineChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Blood Stream Infection (BSI) CHART',
      },
    },
  };

  const labels = getValues('bsiForm.finalIcuDataSet').map((x, i) => {
    return x.monthName;
  });

  const lineChartData = {
    labels,
    datasets: [
      {
        label: 'Bsi',

        data: getValues('bsiForm.finalIcuDataSet').map((x, i) => {
          // let tempObj =  x.infected_bsi
          // finalArr.push(tempObj)
          // console.log( finalArr)
          return x.infected_bsi;
        }),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
      {
        label: 'Clabsi',

        data: getValues('bsiForm.finalIcuDataSet').map((x, i) => {
          // let tempObj =  x.infected_bsi
          // finalArr.push(tempObj)
          // console.log( finalArr)
          return x.infected_clabsi;
        }),
        borderColor: 'rgb(230, 90, 100)',
        backgroundColor: 'rgba(235, 95, 120, 0.5)',
      },
      {
        label: 'Bsi Rate',
        data: getValues('bsiForm.finalIcuDataSet').map((x, i) => {
          return x.bsi_pt_days_rate;
        }),
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
      {
        label: 'CLABSI Rate',
        data: getValues('bsiForm.finalIcuDataSet').map((x, i) => {
          return x.clabsi_pt_days_rate;
        }),
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },

      {
        label: 'Benchmark',
        data: getValues('bsiForm.finalIcuDataSet').map((x, i) => {
          return x.last_column;
        }),
        borderColor: 'rgb(100, 162, 235)',
        backgroundColor: 'rgba(83, 162, 235, 0.5)',
      },
    ],
  };

  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [filterCheck, setFilterCheck] = useState(false);
  const [token, setToken] = useState('');

  const [currentInvasiveLines, setCurrentInvasiveLines] = useState([]);

  const bloodCultureInputRef = useRef(null);
  const phlebitisInputRef = useRef(null);

  const [isCreatedCheck, setIsCreatedCheck] = useState(false);
  const [isModifiedCheck, setIsModifiedCheck] = useState(false);

  const [deleteCheck, setDeleteCheck] = useState(false);
  const [errCheck, setErrCheck] = useState(false);

  const addFields = () => {
    append({
      department: '',
      date: new Date().toISOString().slice(0, 10),
      wbc: 0,
      temperature: 0,
      bp: 0,
      max_bp: 0,
      remarks: '',
      blood_test_image: '',
      diarrhea: false,
      phlebitis: '',
      patient_image: '',
      clabsi_val: '',
      // blood_culture: false // OLDER || 2 Radio Buttons
      blood_cultures: 'na', // NEWER || 3 Radio Buttons

      is_infected: false,
      enableAutoSizeField: false,
    });
  };

  const removeFields = async (id, index) => {
    console.log(id);
    console.log(index);

    if (id) {
      try {
        remove(index);
        const tempBsiLogs = await axios.delete(
          `${apiUrl}/pkli_forms/bsi_logs/${id}`,
          {
            headers: {
              Authorization: `${token}`,
            },
          }
        );
        console.log('tempBsiLogs.data', tempBsiLogs.data);
        handleDeleteMsgFunc(setDeleteCheck);
      } catch (err) {
        handleErrMsgFunc(setErrCheck);
      }
    } else {
      remove(index);
    }
  };

  const DeleteBsiRecord = async () => {
    let id = parseInt(getValues('bsiForm.tempRecordId'));
    // console.log(parseInt(id));
    if (id) {
      try {
        const tempResp = await axios.delete(`${apiUrl}/pkli_forms/bsi/${id}`, {
          headers: {
            Authorization: `${token}`,
          },
        });

        console.log('tempResp', tempResp);

        fetchNewRecordArr();
        handleDeleteMsgFunc(setDeleteCheck);
      } catch (err) {
        handleErrMsgFunc(setErrCheck);
      }
    }
  };

  const handleCancelClick = () => {
    setValue('bsiForm_dynamicRow', []);
    setValue('bsiForm.tempBsiArr', []);
    setValue('bsiForm.counter', 0);

    setValue('bsiForm.patient', '');
    setValue('bsiForm.patient_name', 'Select Name');
    setValue('bsiForm.mrn', 'Select MRN');
    setValue('bsiForm.age', '');
    setValue('bsiForm.department', '');
    setValue('bsiForm.departmentId', '');
    setValue('bsiForm.phlebitis', false);
    setValue('bsiForm.grade', false);
    setValue('bsiForm.allogenicStemCheck', false);

    setValue('bsiForm.tempBsiLogsObj', {});
    setValue('bsiForm.invasive_line_insertion', new Date());
    setValue('bsiForm.invasive_line_insertion', new Date());

    setValue('bsiForm.has_removal_date', false);

    setValue('bsiForm.hasNext', false);
    setValue('bsiForm.hasPrevious', false);
  };

  const onSubmit = async (e) => {
    console.log('errors', errors);
    let x = watch();
    console.log(x);

    x.bsiForm_dynamicRow?.forEach(function (v) {
      v.date = new Date(v.date ?? new Date()).toISOString().slice(0, 10);
      v.department = v.department.title ?? v.department;
      v.clabsi_val = v?.clabsi_val?.title ?? v?.clabsi_val;

      v.diarrhea = v.diarrhea === 'true' ? true : false;

      // v.blood_culture = v.blood_culture === "true" ? true : false // OLDER || 2 Radio Buttons
      v.blood_cultures = v.blood_cultures ?? 'na'; // NEWER || 3 Radio Buttons

      v.is_infected =
        v.is_infected === 'true' ? true : v.is_infected === true ? true : false;
    });
    x.bsiForm_dynamicRow?.forEach(function (v) {
      delete v.bsi;
      delete v.id;
      delete v.enableAutoSizeField;
    });

    const tempId = getValues('bsiForm.patientName').substring(
      0,
      getValues('bsiForm.patientName').indexOf(':')
    );

    let tempObj = {
      patient: tempId,
      invasive_line_insertion: new Date(
        getValues('bsiForm.invasive_line_insertion') ?? new Date()
      )
        .toISOString()
        .slice(0, 10),
      invasive_line_removal: new Date(
        getValues('bsiForm.invasive_line_removal') ?? new Date()
      )
        .toISOString()
        .slice(0, 10),
      has_removal_date:
        getValues('bsiForm.has_removal_date') === 'true'
          ? true
          : getValues('bsiForm.has_removal_date') === true
          ? true
          : false,
      phlebitis:
        getValues('bsiForm.phlebitis') === 'true'
          ? true
          : getValues('bsiForm.phlebitis') === true
          ? true
          : false,
      grade:
        getValues('bsiForm.grade') === 'true'
          ? true
          : getValues('bsiForm.grade') === true
          ? true
          : false,
      bsi_logs: x.bsiForm_dynamicRow,
    };

    console.log('TEMP OBJ FROM POST', tempObj);
    try {
      const resp = await axios.post(`${apiUrl}/pkli_forms/bsi`, tempObj, {
        headers: {
          Authorization: ` ${token}`,
        },
      });
      console.log('resp.data', resp.data);
      handleSubmitMsgFunc(setIsCreatedCheck);
      fetchNewRecordArr();
    } catch (err) {
      // Handle Error Here
      handleErrMsgFunc(setErrCheck);
      console.error(err);
    }
  };

  const fetchDemographicList = async (tempToken) => {
    fetchCompleteRecordsList(tempToken, router, 'demographic_list').then(
      (resp) => {
        if (resp?.error) {
          console.log('ERROR OCCURED WHILE FETCHING DEMOGRAPHIC LIST !');
          handleErrMsgFunc(setErrCheck);
        } else {
          const tempRespArr = resp?.data;
          // console.log('resp')
          setValue('bsiForm.patientList', tempRespArr);
        }
      }
    );
  };

  const fetchBsiList = async (tempToken) => {
    // GET PATIENTS LIST
    fetchDemographicList(tempToken);

    // GET DEPARTMENT LIST
    fetchDropdownList(tempToken, router, 'departments').then((resp) => {
      if (resp?.error) {
        console.log('ERROR OCCURED WHILE FETCHING DEPARTMENT LIST !');
        handleErrMsgFunc(setErrCheck);
      } else {
        setValue('bsiForm.departmentList', resp?.data);
      }
    });
  };

  const handlePDFClick = () => {
    // ORientation, Unit, Format, Compress
    var doc = new jsPDF('landscape', 'px', 'a4', 'false');
    // doc.addImage()
    doc.text('Patient Name :', 20, 25);
    let tempName = getValues('bsiForm.patientName').substring(
      getValues('bsiForm.patientName').indexOf(': ') + 1
    );
    // console.log(tempName)
    doc.text(`${tempName}`, 110, 25);

    doc.text('Patient MRN :', 20, 50);
    let tempMrn = getValues('bsiForm.mrn').substring(
      getValues('bsiForm.mrn').indexOf(': ') + 1
    );
    // console.log(tempName)
    doc.text(`${tempMrn}`, 115, 50);

    doc.text('Insertion Date :', 20, 75);
    doc.text(getValues('bsiForm.invasive_line_insertion'), 116, 75);

    doc.text('Removal Date :', 20, 100);
    doc.text(getValues('bsiForm.invasive_line_removal'), 117, 100);

    doc.addPage();
    let tempArr = getValues('bsiForm_dynamicRow');
    // console.log(tempArr)

    let finalArr = [];
    for (let i in tempArr) {
      finalArr.push([
        tempArr[i].id === '' ? 'Null' : tempArr[i].id,
        tempArr[i].date === '' ? 'Null' : tempArr[i].date,
        tempArr[i].department === '' ? 'Null' : tempArr[i].department,
        tempArr[i].temperature === '' ? 'Null' : tempArr[i].temperature,
        tempArr[i].wbc === '' ? 'Null' : tempArr[i].wbc,
        tempArr[i].bp === '' ? 'Null' : tempArr[i].bp,
        tempArr[i].phlebitis === '' ? 'NULL' : tempArr[i].phlebitis,
        tempArr[i].diarrhea === '' ? 'NULL' : tempArr[i].diarrhea,
        tempArr[i].remarks === '' ? 'NULL' : tempArr[i].remarks,
        // tempArr[i].blood_culture === '' ? 'NULL' : tempArr[i].blood_culture, // OLDER || 2 Radio Buttons
        tempArr[i].blood_cultures === '' ? 'NULL' : tempArr[i].blood_cultures, // NEWER || 3 Radio Buttons
      ]);
    }
    console.log('finalArr', finalArr);

    autoTable(doc, {
      head: [
        [
          'id',
          'Current Date',
          'Department',
          'Temperature',
          'Wbc',
          'BP',
          'Phlebitis',
          'Diarrhea',
          'remarks',
          'Blood Culture',
        ],
      ],
      body: finalArr,
    });

    // doc.save('PDF_Test.pdf')
    // console.log(getValues('bsiForm.patient'))
    doc.save(
      `${getValues('bsiForm.tempRecordId')}:${tempName}(${tempMrn})_${getValues(
        'bsiForm.invasive_line_insertion'
      )}/${getValues('bsiForm.invasive_line_removal')}.pdf`
    );
  };

  const fetchAllRecords = async (tempToken) => {
    // console.log(getValues('bsiForm.tempBsiArr'))
    let tempArr = [];

    for (let i = 0; i < getValues('bsiForm.tempBsiArr').length; i++) {
      let tempId = getValues('bsiForm.tempBsiArr')[i].id;

      const tempResp = await axios.get(`${apiUrl}/pkli_forms/bsi/${tempId}`, {
        headers: {
          Authorization: `${tempToken ?? token}`,
        },
      });
      // console.log("tempResp.data", tempResp.data)
      // console.log(...tempResp.data.bsi_logs)
      tempArr.push(...tempResp.data.bsi_logs);
    }
    // console.log(tempArr)
    setValue('bsiForm.completeLogsArr', tempArr);
  };

  const handlePatientNameChange = async (val, sessionToken) => {
    // console.log(val)
    if (val) {
      setValue('bsiForm.counter', 0);
      const tempPatientId = val.substring(0, val.indexOf(':'));

      const tempResp = await axios.get(
        `${apiUrl}/pkli_forms/demographic/${tempPatientId}`,
        {
          headers: {
            Authorization: `${sessionToken ?? token}`,
          },
        }
      );

      setValue('bsiForm.patientName', val);
      setValue('bsiForm.patient_name', tempResp.data.patient_name);
      setValue('bsiForm.patient', tempResp.data.id);
      setValue('bsiForm.mrn', tempResp.data.mrn);
      setValue('bsiForm.age', tempResp.data.age);
      setValue('bsiForm.departmentId', tempResp.data.department);

      let tempDep = getValues('bsiForm.departmentList').filter(
        (dep) => dep.id === tempResp.data.department
      );
      setValue('bsiForm.department', tempDep[0].title);

      fetchNewRecordArr();
    }
  };

  const handleMRNChange = async (val) => {
    // console.log(val)
    if (val) {
      setValue('bsiForm.counter', 0);
      const tempPatientId = val.substring(0, val.indexOf(':'));

      const tempResp = await axios.get(
        `${apiUrl}/pkli_forms/demographic/${tempPatientId}`,
        {
          headers: {
            Authorization: `${token}`,
          },
        }
      );

      setValue('bsiForm.patientName', val);
      setValue('bsiForm.patient_name', tempResp.data.patient_name);
      setValue('bsiForm.patient', tempResp.data.id);
      setValue('bsiForm.mrn', tempResp.data.mrn);
      setValue('bsiForm.age', tempResp.data.age);
      setValue('bsiForm.departmentId', tempResp.data.department);

      // console.log('bsiForm.patient_name', getValues('bsiForm.patient_name'))
      // console.log('bsiForm.mrn', getValues('bsiForm.mrn'))

      let tempDep = getValues('bsiForm.departmentList').filter(
        (dep) => dep.id === tempResp.data.department
      );
      setValue('bsiForm.department', tempDep[0].title);

      fetchNewRecordArr();
    }
  };

  const fetchNewRecordArr = async () => {
    const tempBsiList = await axios.get(`${apiUrl}/pkli_forms/bsi_list`, {
      headers: {
        Authorization: `${token}`,
      },
    });

    console.log('tempBsiList RESP ', tempBsiList);

    let finalBsiList = [];
    finalBsiList.push(...tempBsiList?.data?.results);
    if (tempBsiList?.data?.next) {
      let tempCount = tempBsiList.data.count;
      if (tempCount >= 10) {
        let z = tempCount / 10;

        // console.log("HERE",x,y,z)
        let tempStr = z.toString();
        // console.log(tempStr[0])
        // console.log(tempStr[2])
        // let tempCounter = 2;
        if (parseInt(tempStr[0]) >= 1) {
          for (let i = 0; i < parseInt(tempStr[0]); i++) {
            // let tempNextLink = tempIcuList?.data?.next
            // const nextRecordList = await axios.get(`${tempNextLink}`, {
            const nextRecordList = await axios.get(
              `${apiUrl}/pkli_forms/bsi_list?page=${i + 2}`,
              {
                headers: {
                  Authorization: `${token}`,
                },
              }
            );

            console.log('nextRecordList RESP ', nextRecordList);
            finalBsiList.push(...nextRecordList?.data?.results);
            // tempCounter + 1;
          }
        }
      }
    }

    let tempArr = (getUniqueArray(finalBsiList, 'id') || []).filter(
      (x) => x.patient_name === getValues('bsiForm.patient_name')
    );
    // let tempArr = (tempBsiList.data.results || []).filter(x => x.patient_name === getValues('bsiForm.patient_name' && x.mrn === getValues('bsiForm.mrn'))

    console.log('temp Bsi Arr', tempArr);
    setValue('bsiForm.tempBsiArr', tempArr);

    if (tempArr.length === 0) {
      setValue('bsiForm_dynamicRow', []);
      addFields();
    }
    let conditionBool = tempArr.length >= 1 ? true : false;

    // console.log("conditionBool", conditionBool)

    console.log(getValues('bsiForm.counter'));
    if (conditionBool && getValues('bsiForm.counter') <= tempArr.length - 1) {
      console.log('IFFFFF');
      setValue('bsiForm.hasNext', true);

      // fetchBsiLogs(tempArr[0].id)
      if (tempArr[0]?.id && getValues('bsiForm.counter') >= 0) {
        //REPEAT
        fetchBsiLogs(tempArr[0]?.id);
      }
    } else {
      console.log('ELSE ');
      if (tempArr[0]?.id && getValues('bsiForm.counter') >= 0) {
        // REPEAT
        fetchBsiLogs(tempArr[0]?.id);
      } else {
        setValue('bsiForm.invasive_line_insertion', new Date());
        setValue('bsiForm.invasive_line_removal', new Date());
        setValue('bsiForm.phlebitis', false);
        setValue('bsiForm.grade', false);
        setValue('bsiForm.allogenicStemCheck', false);
        setValue('bsiForm.has_removal_date', false);
      }
      setValue('bsiForm.hasNext', false);
    }

    fetchAllRecords(token);
  };

  const fetchBsiLogs = async (id) => {
    const tempBsiLogs = await axios.get(`${apiUrl}/pkli_forms/bsi/${id}`, {
      headers: {
        Authorization: `${token}`,
      },
    });
    console.log('tempBsiLogs.data', tempBsiLogs.data);
    setValue('bsiForm.tempBsiLogsObj', tempBsiLogs.data);
    // console.log("CHECK HERRREEE", getValues('bsiForm.tempBsiLogsObj'))

    setValue('bsiForm.tempRecordId', tempBsiLogs.data.id);
    setValue('bsiForm.patient', tempBsiLogs.data.patient);

    // console.log("CAUTI LOGS", tempBsiLogs.data.bsi_logs)
    setValue('bsiForm_dynamicRow', tempBsiLogs.data.bsi_logs);
    setValue(
      'bsiForm.invasive_line_insertion',
      tempBsiLogs.data.invasive_line_insertion
    );
    setValue(
      'bsiForm.invasive_line_removal',
      tempBsiLogs.data.invasive_line_removal
    );
    setValue('bsiForm.has_removal_date', tempBsiLogs.data.has_removal_date);

    console.log(
      'bsiForm.grade',
      tempBsiLogs.data.grade === true
        ? true
        : tempBsiLogs.data.grade === 'true'
        ? true
        : false
    );
    setValue(
      'bsiForm.grade',
      tempBsiLogs.data.grade === true
        ? true
        : tempBsiLogs.data.grade === 'true'
        ? true
        : false
    );
    setValue(
      'bsiForm.phlebitis',
      tempBsiLogs.data.phlebitis === true
        ? true
        : tempBsiLogs.data.phlebitis === 'true'
        ? true
        : false
    );

    console.log('bsiForm.grade', getValues('bsiForm.grade'));

    if (tempBsiLogs.data.grade === true) {
      setValue('bsiForm.allogenicStemCheck', true);
    } else {
      setValue('bsiForm.allogenicStemCheck', false);
    }
  };

  const handleNextClick = async () => {
    handleNextClickFunc('tempBsiArr', fetchBsiLogs, useFormPropObj);

    // console.log("Next click", getValues('bsiForm.tempBsiArr'))
    // let tempArr = getValues('bsiForm.tempBsiArr')
    // console.log("tempArr.length", tempArr.length)
    // console.log("COUNTER", getValues('bsiForm.counter'))

    // if (tempArr && getValues('bsiForm.counter') < tempArr.length) {
    //   console.log("BEFORE", getValues('bsiForm.counter'))
    //   setValue('bsiForm.counter', getValues('bsiForm.counter') + 1)
    //   let id = `${tempArr[getValues('bsiForm.counter')]?.id}`
    //   fetchBsiLogs(id)
    //   if (getValues('bsiForm.counter') === tempArr.length - 1) {
    //     setValue('bsiForm.hasNext', false)
    //   }

    //   // console.log("SET IS NEXT FALSE", getValues('bsiForm.counter'))
    // } else if (getValues('bsiForm.counter') === tempArr.length) {

    //   setValue('bsiForm.hasNext', false)
    // }
  };

  const handlePreviousClick = async () => {
    handlePreviousClickFunc('tempBsiArr', fetchBsiLogs, useFormPropObj);

    // let tempArr = getValues('bsiForm.tempBsiArr')
    // if (tempArr && tempArr.length <= 1) {
    //   setValue('bsiForm.hasPrevious', false)
    // }
    // console.log("BEFORE PREVIOUS", getValues('bsiForm.counter'))
    // if (getValues('bsiForm.counter') !== 0) {
    //   setValue('bsiForm.counter', getValues('bsiForm.counter') - 1)

    //   let id = `${tempArr[getValues('bsiForm.counter')].id}`
    //   console.log("BEFORE PREVIOUS", getValues('bsiForm.counter'))
    //   if (getValues('bsiForm.counter') >= 1) {
    //     console.log("IF ", getValues('bsiForm.counter'), tempArr.length)
    //     fetchBsiLogs(id)
    //     if (getValues('bsiForm.counter') !== tempArr.length - 1) {
    //       setValue('bsiForm.hasNext', true)
    //     }
    //   } else if (getValues('bsiForm.counter') === 0) {
    //     console.log("else IF ", getValues('bsiForm.counter'), tempArr.length)
    //     if (getValues('bsiForm.counter') !== tempArr.length - 1) {
    //       setValue('bsiForm.hasNext', true)
    //     }
    //     fetchBsiLogs(id)
    //     setValue('bsiForm.hasPrevious', false)
    //   };
    // };
  };

  const handleEditClick = async () => {
    let x = watch();
    console.log(x);
    // console.log(x.bsiForm_dynamicRow[0].cultures = Boolean(x.bsiForm_dynamicRow[0].cultures))
    x.bsiForm_dynamicRow?.forEach(function (v) {
      v.date = new Date(v.date ?? new Date()).toISOString().slice(0, 10);
      v.diarrhea = v.diarrhea === 'true' ? true : false;
      v.clabsi_val = v?.clabsi_val?.title ?? v?.clabsi_val;

      // v.blood_culture = v.blood_culture === "true" ? true : false // OLDER || 2 Radio Buttons
      v.blood_cultures = v.blood_cultures ?? 'na'; // NEWER || 3 Radio Buttons

      v.is_infected =
        v.is_infected === 'true' ? true : v.is_infected === true ? true : false;
    });
    x.bsiForm_dynamicRow?.forEach(function (v) {
      delete v.positiveCultures;
      delete v.enableAutoSizeField;
    });
    console.log(getValues('bsiForm.tempBsiArr'));
    let tempObj = {
      id: parseInt(getValues('bsiForm.tempRecordId')),
      patient: parseInt(getValues('bsiForm.patient')),
      invasive_line_insertion: new Date(
        getValues('bsiForm.invasive_line_insertion') ?? new Date()
      )
        .toISOString()
        .slice(0, 10),
      invasive_line_removal: new Date(
        getValues('bsiForm.invasive_line_removal') ?? new Date()
      )
        .toISOString()
        .slice(0, 10),
      has_removal_date:
        getValues('bsiForm.has_removal_date') === 'false'
          ? false
          : getValues('bsiForm.has_removal_date') === false
          ? false
          : true,
      phlebitis: getValues('bsiForm.phlebitis') === 'true' ? true : false,
      grade: getValues('bsiForm.grade') === 'true' ? true : false,
      bsi_logs: x.bsiForm_dynamicRow,
    };
    console.log(tempObj);
    try {
      console.log('tempObj HERE', tempObj);
      const resp = await axios.put(`${apiUrl}/pkli_forms/bsi`, tempObj, {
        headers: {
          Authorization: ` ${token}`,
        },
      });
      console.log('resp.data', resp.data);
      setValue('bsiForm.tempBsiLogsObj', resp.data);
      handleEditMsgFunc(setIsModifiedCheck);
    } catch (err) {
      handleErrMsgFunc(setErrCheck);

      console.error(err);
    }
  };

  var getDaysArray = function (s, e) {
    for (
      var a = [], d = new Date(s);
      d <= new Date(e);
      d.setDate(d.getDate() + 1)
    ) {
      a.push(new Date(d));
    }
    return a;
  };

  const handleFiltration = async () => {
    // console.log(tempIcuLogsArr)

    let dummyArr = [];
    // console.log(getDaysArray(getValues('bsiForm.filterStartDate'), getValues('bsiForm.filterEndDate')))
    getDaysArray(
      getValues('bsiForm.filterStartDate'),
      getValues('bsiForm.filterEndDate')
    ).map((x, i) => {
      console.log(new Date(x).getMonth() + 1, new Date(x).getFullYear());

      let tempMonth = new Date(x).getMonth() + 1;
      let tempYear = new Date(x).getFullYear();

      let monthVal = getMonthShortName(tempMonth);
      let yearVal = String(tempYear).slice(-2);

      if (i === 0) {
        dummyArr.push(`${tempMonth}-${yearVal}`);
      } else if (new Date(dummyArr[i - 1]).getMonth() + 1 !== tempMonth) {
        dummyArr.push(`${tempMonth}-${yearVal}`);
      }
      dummyArr = uniq(dummyArr);
      console.log(dummyArr);
      // if(dummyArr){
      // let uniqueArrWithObjs = [...new Map(arr.map((item) => [item[objKey ?? 'id'], item])).values()]
      // console.log(uniq(dummyArr))

      // }
    });
    // handleDateTest(getValues('bsiForm.filterStartDate'), getValues('bsiForm.filterEndDate'))

    // let tempBsiLogsArr = getNumbOfMonths(getValues('bsiForm.filterStartDate'), getValues('bsiForm.filterEndDate'))

    let tempBsiLogsArr = getValues('bsiForm.finalBsiArrForFiltration');
    // console.log(tempBsiLogsArr);

    let tempDepName = getValues('bsiForm.filterDepartment').substring(
      getValues('bsiForm.filterDepartment').indexOf(': ') + 2
    );
    // console.log(tempDepName);

    let tempStartDate = convertDateToISO('bsiForm.filterStartDate', getValues);
    // // console.log(tempStartDate)

    let tempEndDate = convertDateToISO('bsiForm.filterEndDate', getValues);
    // // console.log(tempEndDate)

    let tempFilteredBsiDepArr = tempBsiLogsArr.filter(
      (v) => v.department === tempDepName
    );
    // // console.log(tempFilteredBsiDepArr);

    let tempFilteredBsiDurationArr = tempFilteredBsiDepArr.filter(
      (v) => v.date >= tempStartDate && v.date <= tempEndDate
    );
    console.log(tempFilteredBsiDurationArr);

    // setValue('bsiForm.arrForFiltration', tempFilteredBsiDurationArr)

    setValue(
      'bsiForm.arrForFiltration',
      getUniqueArray(tempFilteredBsiDurationArr, 'id')
    );
    setValue(
      'bsiForm_dynamicRow',
      getUniqueArray(tempFilteredBsiDurationArr, 'id')
    );

    let tempIcuLogsArr = getValues('bsiForm.finalIcuArrForFiltration');
    let finalDataSet = [];
    let tempFilteredIcuDepArr = tempIcuLogsArr.filter(
      (v) => v.department === tempDepName
    );
    // console.log('tempFilteredIcuDepArr',tempFilteredIcuDepArr);
    let tempFilteredIcuDurationArr = tempFilteredIcuDepArr.filter(
      (v) => v.sicu >= tempStartDate && v.sicu <= tempEndDate
    );
    console.log('tempFilteredIcuDurationArr', tempFilteredIcuDurationArr);
    setValue('bsiForm.filteredIcuDurationArr', tempFilteredBsiDurationArr);
    console.log(getValues('bsiForm.finalMonthNamesArr'));

    for (let z = 0; z < dummyArr.length; z++) {
      let tempMonthNumber = String(dummyArr[z]).slice(
        0,
        String(dummyArr[z]).indexOf('-')
      );
      let tempYearNumber = String(dummyArr[z]).slice(
        String(dummyArr[z]).lastIndexOf('-')
      );

      // let tempMonthName = getValues('bsiForm.finalMonthNamesArr')[z]
      let tempObj = {
        monthName: `${monthNameShort[tempMonthNumber]}${tempYearNumber}`,

        // monthName: tempMonthName.monthName,
        ttl_pt_days: 0,
        ttl_cvp_days: 0,
        ttl_iv_days: 0,
        infected_bsi: 0,
        infected_clabsi: 0,
        bsi_pt_days_rate: 0,
        clabsi_pt_days_rate: 0,
        bsi_cvp_days_rate: 0,
        clabsi_cvp_days_rate: 0,
        last_column: 4,
      };

      finalDataSet.push(tempObj);

      let monthLastTwoCharc = parseInt(tempObj.monthName.slice(-2));
      let monthFirstThreeCharc = tempObj.monthName.slice(0, 3);

      getUniqueArray(tempFilteredIcuDurationArr, 'id').map((x) => {
        let tempYear = parseInt(
          new Date(x.sicu ?? new Date()).getFullYear().toString().slice(-2)
        );
        let tempMonth = new Date(x.sicu ?? new Date()).getMonth() + 1;
        if (
          tempYear === monthLastTwoCharc &&
          monthFirstThreeCharc === getMonthShortName(tempMonth)
        ) {
          // console.log('x.patient_days', x.patient_days)
          finalDataSet[z].ttl_pt_days = x.patient_days ?? 0;
          finalDataSet[z].ttl_cvp_days = x.cvp_line_days ?? 0;
          finalDataSet[z].ttl_iv_days = x.iv_line_days ?? 0;

          // finalDataSet[z].infected_bsi = 0
        }
      });
      setValue(
        'bsiForm.finalIcuDataSet',
        getUniqueArray(finalDataSet, 'monthName')
      );

      let tempSortedBsiList = getValues('bsiForm_dynamicRow').sort((a, b) => {
        return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
      });
      console.log('tempSortedBsiList', tempSortedBsiList);

      let infectedBsiCounter = 0;
      let infectedClabsiCounter = 0;

      tempSortedBsiList.map((x, indexCounter) => {
        let tempYear = parseInt(
          new Date(x.date ?? new Date()).getFullYear().toString().slice(-2)
        );
        let tempMonth = new Date(x.date ?? new Date()).getMonth() + 1;

        if (
          tempYear === monthLastTwoCharc &&
          monthFirstThreeCharc === getMonthShortName(tempMonth)
        ) {
          // console.log('work')

          let tempCultureCheck = x.blood_cultures === 'yes';
          let tempDepCheck = x.department === tempDepName;
          let infectedBsiCheck = x.clabsi_val !== 'NA';

          let isInfectedCheck =
            x.is_infected === 'true' || x.is_infected === true;

          if (
            tempDepCheck &&
            // indexCounter >= 2 &&
            tempCultureCheck
          ) {
            if (isInfectedCheck) {
              if (infectedBsiCheck) {
                infectedBsiCounter += 1;
                finalDataSet[z].infected_bsi = infectedBsiCounter ?? 0;
              } else {
                infectedClabsiCounter += 1;
                finalDataSet[z].infected_clabsi = infectedClabsiCounter ?? 0;
              }
            }
          }
        }
      });

      finalDataSet.map((x, i) => {
        if (x.ttl_iv_days > 0 || x.infected_bsi > 0) {
          let tempBsiPtRate = (x.infected_bsi / x.ttl_iv_days) * 1000;

          finalDataSet[z].bsi_pt_days_rate = tempBsiPtRate;
        } else if (x.ttl_cvp_days > 0 || x.infected_clabsi > 0) {
          let tempClabsiPtRate = (x.infected_clabsi / x.ttl_cvp_days) * 1000;

          finalDataSet[z].clabsi_pt_days_rate = tempClabsiPtRate;
        }

        if (x.ttl_iv_days > 0 || x.ttl_pt_days > 0) {
          let tempBsiRate = x.ttl_iv_days / x.ttl_pt_days;

          finalDataSet[z].bsi_cvp_days_rate = tempBsiRate;
        } else if (x.ttl_cvp_days > 0 || x.ttl_pt_days > 0) {
          let tempClabsiRate = x.ttl_cvp_days / x.ttl_pt_days;

          finalDataSet[z].clabsi_cvp_days_rate = tempClabsiRate;
        }

        // if (x.ttl_pt_days > 0 || x.infected_clabsi > 0) {
        //   let tempPtRate = (x.infected_clabsi / x.ttl_pt_days) * 1000

        //   finalDataSet[z].pt_days_rate = tempPtRate
        // }

        // if (x.ttl_catheter_days > 0 || x.infected_clabsi > 0) {
        //   let tempBsiRate = (x.infected_clabsi / x.ttl_catheter_days) * 1000
        //   finalDataSet[z].catheter_days_rate = tempBsiRate
        // }
      });
    }

    console.log('finalDataSet', finalDataSet);
    setValue('bsiForm.finalIcuDataSet', finalDataSet); //getUniqueArray(finalDataSet, 'monthName')
  };

  const handleDateTest = (startDate, endDate) => {
    let tempEndMonth = new Date(endDate ?? new Date()).getMonth();
    let tempStartMonth = new Date(startDate ?? new Date()).getMonth();

    let tempEndYear = new Date(endDate ?? new Date()).getFullYear();
    let tempStartingYear = new Date(startDate ?? new Date()).getFullYear();

    let monthsBtwnDates =
      tempEndMonth - tempStartMonth + 12 * (tempEndYear - tempStartingYear);

    let finalMonthNamesArr = [];

    // let tempMonth = monthNameShort[new Date(getValues('bsiForm.filterStartDate')).getMonth()];
    // console.log(tempMonth)

    let tempCounter = 1;
    // @@
    let tempStartYear = new Date(
      getValues('bsiForm.filterStartDate') ?? new Date()
    )
      .getFullYear()
      .toString()
      .slice(-2);

    let customCheck = true;
    for (let i = 0; i <= monthsBtwnDates; i++) {
      // let tempMonth = new Date(getValues('bsiForm.filterStartDate')).getMonth();
      // let monthName = monthNameShort[new Date(getValues('bsiForm.filterStartDate')).getMonth() + tempCounter];
      let randCounter = i + 1;
      let testVar = getMonthShortName(
        new Date(getValues('bsiForm.filterStartDate')).getMonth() + randCounter
      );
      console.log(testVar);
      // let monthName = monthNameShort[new Date(getValues('bsiForm.filterStartDate')).getMonth() + tempCounter];
      // tempCounter++;

      console.log(testVar);
      let tempObj = {
        // monthName: `${testVar}-${tempStartYear}`,
        monthName: `${
          customCheck && testVar === 'Mar' ? 'Feb' : testVar
        }-${tempStartYear}`,
        // monthName: `${testVar}-${monthName}-${tempStartYear}`,
      };
      finalMonthNamesArr.push(tempObj);
      if (customCheck && testVar === 'Mar') {
        // testVar === 'Feb'
        customCheck = false;
      }
      if (testVar === 'Dec') {
        tempStartYear = parseInt(tempStartYear) + 1;
        customCheck = true;
      }
      console.log(finalMonthNamesArr);
      setValue('bsiForm.finalMonthNamesArr', finalMonthNamesArr);
    }
  };

  const fetchIcuRecords = async () => {
    const tempIcuList = await axios.get(
      `${apiUrl}/pkli_forms/icu_denominator_list`,
      {
        headers: {
          Authorization: `${token}`,
        },
      }
    );

    console.log('tempIcuList RESP ', tempIcuList);
    let finalUserList = [];
    finalUserList.push(...tempIcuList?.data?.results);
    console.log('finalUserList', finalUserList);
    if (tempIcuList?.data?.next) {
      let tempCount = tempIcuList.data.count;
      if (tempCount >= 10) {
        let z = tempCount / 10;

        // console.log("HERE",x,y,z)
        let tempStr = z.toString();
        // console.log(tempStr[0])
        // console.log(tempStr[2])
        // let tempCounter = 2;
        if (parseInt(tempStr[0]) >= 1) {
          for (let i = 0; i < parseInt(tempStr[0]); i++) {
            // let tempNextLink = tempIcuList?.data?.next
            // const nextRecordList = await axios.get(`${tempNextLink}`, {
            const nextRecordList = await axios.get(
              `${apiUrl}/pkli_forms/icu_denominator_list?page=${i + 2}`,
              {
                headers: {
                  Authorization: `${token}`,
                },
              }
            );
            finalUserList.push(...nextRecordList?.data?.results);
          }
          console.log('finalUserList', finalUserList);
        }
      }
    }

    // let uniqueArrWithLogs = [...new Map(finalUserList.map((item) => [item["id"], item])).values()]
    // console.log("after", uniqueArrWithLogs);
    setValue(
      'bsiForm.finalIcuArrForFiltration',
      getUniqueArray(finalUserList, 'id')
    );
  };

  const handleFilterMode = async (e) => {
    e.preventDefault();
    // console.log(filterCheck)
    setFilterCheck(!filterCheck);
    // console.log(filterCheck)

    // let arrForFiltration = [];
    // let bsiLogsArr = []

    let arrWithRecords = [];
    let arrWithLogs = [];

    const tempBsiList = await axios.get(`${apiUrl}/pkli_forms/bsi_list`, {
      headers: {
        Authorization: `${token}`,
      },
    });

    // console.log("tempBsiList RESP ", tempBsiList)

    let finalBsiList = [];
    finalBsiList.push(...tempBsiList?.data?.results);

    if (tempBsiList?.data?.next) {
      let tempCount = tempBsiList.data.count;
      if (tempCount >= 10) {
        let z = tempCount / 10;
        // console.log("HERE",x,y,z)
        let tempStr = z.toString();
        if (parseInt(tempStr[0]) >= 1) {
          for (let i = 0; i < parseInt(tempStr[0]); i++) {
            const nextRecordList = await axios.get(
              `${apiUrl}/pkli_forms/bsi_list?page=${i + 2}`,
              {
                headers: {
                  Authorization: `${token}`,
                },
              }
            );

            console.log('nextRecordList RESP ', nextRecordList);
            finalBsiList.push(...nextRecordList?.data?.results);
            // tempCounter + 1;
          }
          // setValue('ssiForm.patientListArr', finalBsiList)
        }
      }
    }

    for (let item of finalBsiList) {
      console.log(item);
      if (item?.id) {
        const tempBsiLogs = await axios.get(
          `${apiUrl}/pkli_forms/bsi/${item.id}`,
          {
            headers: {
              Authorization: `${token}`,
            },
          }
        );

        // tempBsiLogs.then(resp => console.log(resp.data))
        console.log(tempBsiLogs.data);
        arrWithRecords.push(tempBsiLogs.data);
      }
      console.log(arrWithRecords);

      for (const x of arrWithRecords) {
        console.log(x);
        arrWithLogs.push(...x.bsi_logs);
      }

      // console.log('arrWithLogs', arrWithLogs)

      setValue(
        'bsiForm.finalBsiArrForFiltration',
        getUniqueArray(arrWithLogs, 'id')
      );

      fetchIcuRecords();
    }
  };

  const useFormPropObj = {
    formName: 'bsiForm',
    register,
    getValues,
    setValue,
    watch,
    fields,
  };

  const filterDataPropObj = {
    formName: 'bsiForm',
    filterCheck,
    setFilterCheck,
    handleFiltration,
  };

  useEffect(() => {
    let x = JSON.parse(localStorage.getItem('userInfo'));
    if (x) {
      setIsLoading(false);
      if (getValues('bsiForm_dynamicRow').length < 1) {
        addFields();

        setToken(x.token);

        fetchBsiList(x.token);

        console.log(watch());
      }
    } else {
      setIsLoading(true);
      router.push('/');
    }
  }, [token, isLoading, fields, watch]);

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid container className={' p-1 '} sx={{ padding: '1em' }}>
          <FormsTitle
            title={'Blood Stream Infection (BSI) Form'}
            customPadding={'0.5em'}
          />

          {filterCheck ? (
            <>
              <DepFiltrationRowComp
                useFormPropObj={useFormPropObj}
                filterData={filterDataPropObj}
                lineChartData={lineChartData}
                lineChartOptions={lineChartOptions}
              />
            </>
          ) : (
            <>
              {/* TOP ROW */}
              <DynamicFormTopRow
                dataObj={{
                  token,
                  ageVal: `${getValues('bsiForm.age') ?? noOptionAvail}`,
                }}
                listData={{
                  patientList: `${
                    getValues('bsiForm.patientList') ?? noOptionAvail
                  } `,
                  depList: `${
                    getValues('bsiForm.departmentList') ?? noOptionAvail
                  }`,
                }}
                methodsObj={{
                  handlePatientNameChange,
                  handleMRNChange,
                }}
                useFormPropObj={useFormPropObj}
              />

              {/* SECOND ROW */}
              <Grid
                item
                xs={12}
                sx={{
                  display: 'flex',
                  padding: '1em 0',
                }}
              >
                <DynamicFormTwoDates
                  firstDateObj={{
                    label: 'Insertion Date',
                    valStr: 'bsiForm.invasive_line_insertion',
                  }}
                  secondDateObj={{
                    label: 'Removal Date',
                    valStr: 'bsiForm.invasive_line_removal',
                  }}
                  removalDateCheck={{
                    valStr: 'bsiForm.has_removal_date',
                  }}
                  useFormPropObj={useFormPropObj}
                />

                <Grid
                  item
                  xs={6}
                  className=" p-l_1 align-start"
                  sx={{
                    paddingLeft: '1em',
                    alignItems: 'flex-start',
                  }}
                >
                  {/* FIRST CHECK || Allogenic Check */}
                  <DoubleRadioButtonWithTooltip
                    dataObj={{
                      title:
                        'Allogenic hematopoietic stem cell transplant recipent for last years',
                      valStr: 'bsiForm.allogenicStemCheck',
                      desc: 'Allo. hematopoietic stem cell transplant',
                    }}
                    useFormPropObj={useFormPropObj}
                  />

                  {/* SECOND CHECK || Grade Check*/}

                  <Grid
                    item
                    xs={12}
                    className="d-flex"
                    sx={{ display: 'flex' }}
                  >
                    <Grid item xs={8}>
                      <Typography
                        fontWeight="bold"
                        variant="body2"
                        sx={{
                          fontSize: {
                            xs: '8px',
                            md: '11px',
                            lg: '14px',
                            xl: '17px',
                          },

                          color:
                            getValues('bsiForm.allogenicStemCheck') !== 'true'
                              ? '#979797'
                              : 'black',
                        }}
                      >
                        Grade III or IV GI GVHD
                      </Typography>
                    </Grid>
                    <Grid item xs={3.8}>
                      <FormControl>
                        {/* <DisabledDoubleRadio register={register} isDisabled={getValues("bsiForm.allogenicStemCheck") === "" ||
                getValues("bsiForm.allogenicStemCheck") === "no"} label_1={"Yes"} label_2={"No"} value={"bsiForm.gradeIII"} /> */}
                        {/* <DisabledDoubleRadio register={register} isDisabled={getValues("bsiForm.allogenicStemCheck") !== "true" } label_1={"Yes"} label_2={"No"} value={"bsiForm.grade"} /> */}

                        <RadioGroup
                          row
                          // value={getValues('bsiForm.grade') === 'true'  ? true : false}
                          value={getValues('bsiForm.grade') ?? false}
                        >
                          <FormControlLabel
                            value={true}
                            disabled={
                              getValues('bsiForm.allogenicStemCheck') ===
                              'false'
                                ? true
                                : getValues('bsiForm.allogenicStemCheck') ===
                                  false
                                ? true
                                : false
                            }
                            control={<Radio {...register('bsiForm.grade')} />}
                            label={
                              <Typography
                                sx={styles.fontSize}
                                style={{
                                  color:
                                    getValues('bsiForm.allogenicStemCheck') ===
                                    'false'
                                      ? '#979797'
                                      : getValues(
                                          'bsiForm.allogenicStemCheck'
                                        ) === false
                                      ? '#979797'
                                      : 'black',
                                }}
                              >
                                Yes
                              </Typography>
                            }
                            sx={styles.radioButtonStyles}
                            style={{
                              color:
                                getValues('bsiForm.allogenicStemCheck') !==
                                'true'
                                  ? '#979797'
                                  : 'black',
                            }}
                          />
                          <FormControlLabel
                            value={false}
                            // disabled={getValues("bsiForm.allogenicStemCheck") !== "true" ? true : false }
                            disabled={
                              getValues('bsiForm.allogenicStemCheck') ===
                              'false'
                                ? true
                                : getValues('bsiForm.allogenicStemCheck') ===
                                  false
                                ? true
                                : false
                            }
                            control={<Radio {...register('bsiForm.grade')} />}
                            // label={label_2}
                            label={
                              <Typography
                                sx={styles.fontSize}
                                style={{
                                  color:
                                    getValues('bsiForm.allogenicStemCheck') ===
                                    'false'
                                      ? '#979797'
                                      : getValues(
                                          'bsiForm.allogenicStemCheck'
                                        ) === false
                                      ? '#979797'
                                      : 'black',
                                }}
                                // style={{
                                //   color: getValues("bsiForm.allogenicStemCheck") !== "true"  ? "#979797" : "black",
                                // }}
                              >
                                No
                              </Typography>
                            }
                            sx={{
                              marginRight: '11px',
                              '& .MuiSvgIcon-root': { height: 15, width: 15 },
                              '& .MuiButtonBase-root': {
                                padding: '5px',
                                paddingLeft: '9px',
                              },
                            }}
                          />
                        </RadioGroup>
                      </FormControl>
                    </Grid>
                  </Grid>

                  {/* THIRD CHECK || Phlebitis Check*/}
                  <DoubleRadioButtonWithTooltip
                    dataObj={{
                      title: 'Phlebitis Check',
                      valStr: 'bsiForm.phlebitis',
                      desc: 'Phlebitis',
                    }}
                    useFormPropObj={useFormPropObj}
                  />
                </Grid>
              </Grid>
            </>
          )}

          {/* DYNAMIC ROWS */}

          {filterCheck ? (
            <Grid xs={12} item>
              <Button
                size="medium"
                //  disabled={getValues('bsiForm.patient') === ''}
              >
                <CSVLink
                  data={getValues('bsiForm.finalIcuDataSet')}
                  filename={`BSI(${getValues('bsiForm.filterDepartment')}).xls`}
                  target="_blank"
                  headers={bsiCSVHeaderTitles}
                >
                  CSV
                </CSVLink>
              </Button>
            </Grid>
          ) : (
            ''
          )}

          <BsiDynamicRow
            useFormPropObj={useFormPropObj}
            filterCheck={filterCheck}
            bloodCultureInputRef={bloodCultureInputRef}
            phlebitisInputRef={phlebitisInputRef}
            removeFields={removeFields}
          />
        </Grid>

        {filterCheck ? (
          ''
        ) : (
          <>
            <Grid
              item
              xs={12}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginY: '1em',
              }}
            >
              <ButtonsRowComp
                useFormPropObj={useFormPropObj}
                dataObj={{
                  arrName: 'tempBsiArr',
                  fileName: `${getValues('bsiForm.tempRecordId')}_${getValues(
                    'bsiForm.patientName'
                  )}(${getValues('bsiForm.mrn')})_${getValues(
                    'bsiForm.invasive_line_insertion'
                  )}/${getValues('bsiForm.invasive_line_removal')}.xls`,
                  disableIdCheck: getValues('bsiForm.patient') === '',
                }}
                leftSectionDataObj={{
                  disableIdCheck: getValues('bsiForm.patient') === '',

                  cancelBtnData: {
                    title: 'Reset BSI Form',
                    desc: 'Reset form and Delete all temporary data ',
                  },

                  deleteBtnData: {
                    bodyDesc: `Patient Name: ${
                      getValues('bsiForm.patient_name') ?? 'NAME'
                    }(${getValues('bsiForm.mrn') ?? 'MRN'}) `,
                    dateDesc: ` Date: ${
                      getValues('bsiForm.invasive_line_insertion')
                        ? getValues('bsiForm.invasive_line_insertion')
                        : new Date().toISOString().slice(0, 10)
                    } / ${
                      getValues('bsiForm.invasive_line_removal')
                        ? getValues('bsiForm.invasive_line_removal')
                        : new Date().toISOString().slice(0, 10)
                    }`,
                  },
                }}
                leftSectionMethodsObj={{
                  addFields,
                  onSubmit,
                  handleEditClick,
                  // DeleteBsiRecord,
                  handleCancelClick,
                  handleDeleteClick: DeleteBsiRecord,
                }}
                rightSectionMethodsObj={{
                  handleNextClick,
                  handlePreviousClick,
                }}
                menuDataObj={{
                  singleCsvData: getValues('bsiForm_dynamicRow'),
                  completeCsvData: getValues('bsiForm.completeLogsArr'),
                  headers: bsiCsvHeaders,
                }}
                menuMethodsObj={{
                  handlePDFClick,
                  handleFilterMode,
                }}
              />
            </Grid>

            <MessageComp
              name={getValues('bsiForm.patient_name') ?? " ' Select NAME ' "}
              insertionDate={`bsiForm.invasive_line_insertion`}
              removalDate={`bsiForm.invasive_line_removal`}
              getValues={getValues}
              isCreatedCheck={isCreatedCheck}
              isModifiedCheck={isModifiedCheck}
              deleteCheck={deleteCheck}
              errCheck={errCheck}
            />
          </>
        )}

        <input style={{ display: 'none' }} type="submit" />
      </form>
    </>
  );
};

export default Bsi;
